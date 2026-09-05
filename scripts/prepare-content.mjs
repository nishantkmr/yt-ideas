import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {
  discoverContentFiles,
  narrationCueNames,
  publicRoot,
  projectRoot,
  readJson,
  relativeToProject,
  sha256,
  validateContent,
} from './content-tools.mjs';

const timingFile = join(projectRoot, 'src', 'config', 'timing.json');
const timingSource = await readFile(timingFile, 'utf8');
const timing = JSON.parse(timingSource);
const assetLicenseFile = join(projectRoot, 'asset-licenses.json');
const assetLicenseSource = await readFile(assetLicenseFile, 'utf8');
const outputDirectory = join(projectRoot, 'work', 'manifests');
await mkdir(outputDirectory, {recursive: true});

for (const file of await discoverContentFiles()) {
  const source = await readFile(file, 'utf8');
  const content = JSON.parse(source);
  const result = await validateContent(content);

  if (result.errors.length > 0) {
    throw new Error(`${relativeToProject(file)} failed validation. Run npm run validate:content.`);
  }
  if (content.review.status !== 'approved') {
    throw new Error(`${relativeToProject(file)} needs human approval before manifest preparation.`);
  }

  const sourceHash = sha256(source);
  const roundSeconds =
    timing.episode.question + timing.episode.countdown + timing.episode.answer;
  const durationInFrames =
    result.kind === 'episode'
      ? (timing.episode.intro + content.questions.length * roundSeconds + timing.episode.outro) * timing.fps
      : (timing.short.intro +
          timing.short.clue * 2 +
          timing.short.countdown +
          timing.short.answer +
          timing.short.fact +
          timing.short.outro) * timing.fps;
  const visuals =
    result.kind === 'episode'
      ? content.questions.flatMap((question) => question.visual ? [question.visual.asset] : [])
      : [content.visual.asset];
  const narrationAssets = content.narration?.enabled
    ? narrationCueNames(content, result.kind).map(
        (cue) => `${content.narration.audioBase}/${cue}.${content.narration.format}`,
      )
    : [];
  const assets = [
    ...new Set([
      'assets/quiz-owl.png',
      'audio/sfx/countdown-tick.wav',
      `audio/music/${content.creative.visualTheme}.wav`,
      ...visuals,
      ...narrationAssets,
    ]),
  ].sort();
  const assetSha256 = Object.fromEntries(
    await Promise.all(
      assets.map(async (asset) => [asset, sha256(await readFile(join(publicRoot, asset)))]),
    ),
  );
  const manifest = {
    schemaVersion: 2,
    contentId: content.id,
    kind: result.kind,
    source: relativeToProject(file),
    sourceSha256: sourceHash,
    timingSha256: sha256(timingSource),
    rightsRegistry: {
      source: relativeToProject(assetLicenseFile),
      sha256: sha256(assetLicenseSource),
    },
    review: content.review,
    video: {fps: timing.fps, durationInFrames},
    assets,
    assetSha256,
    content,
  };
  const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestHash = sha256(manifestSource);
  const output = join(outputDirectory, `${content.id}-${manifestHash.slice(0, 12)}.json`);

  try {
    await writeFile(output, manifestSource, {flag: 'wx'});
    console.log(`PREPARED ${relativeToProject(output)}`);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      console.log(`EXISTS ${relativeToProject(output)}`);
    } else {
      throw error;
    }
  }
}
