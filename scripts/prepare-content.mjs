import {mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {
  discoverContentFiles,
  narrationCueNames,
  publicRoot,
  projectRoot,
  relativeToProject,
  sha256,
  validateContent,
  writeImmutableJson,
} from './content-tools.mjs';
import {episodeDurationInFrames, shortDurationInFrames} from '../src/config/durations.mjs';

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
  // Shared with src/config/timing.ts, which is what Remotion's calculateMetadata
  // uses, so the manifest cannot record a duration the render disagrees with.
  const durationInFrames =
    result.kind === 'episode'
      ? episodeDurationInFrames(timing, content.questions, content.outroTimeSeconds)
      : shortDurationInFrames(timing, content.clueTimeSeconds);
  // Code-native visuals such as the digestive diagram carry no asset file.
  const visuals =
    result.kind === 'episode'
      ? content.questions.flatMap((question) =>
          typeof question.visual?.asset === 'string' ? [question.visual.asset] : [],
        )
      : typeof content.visual?.asset === 'string'
        ? [content.visual.asset]
        : [];
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
    schemaVersion: 3,
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
  const manifestHash = sha256(`${JSON.stringify(manifest, null, 2)}\n`);
  const output = join(outputDirectory, `${content.id}-${manifestHash.slice(0, 12)}.json`);
  const {created} = await writeImmutableJson(output, manifest);
  console.log(`${created ? 'PREPARED' : 'EXISTS'} ${relativeToProject(output)}`);
}
