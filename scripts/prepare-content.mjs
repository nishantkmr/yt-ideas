import {mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CONTENT_OPTIONS, isExplicitTarget, parseCli, selectTargets} from './cli.mjs';
import * as tools from './content-tools.mjs';
import {episodeDurationInFrames, shortDurationInFrames} from '../src/config/durations.mjs';

const {
  narrationCueNames,
  publicRoot,
  projectRoot,
  relativeToProject,
  sha256,
  validateContent,
  writeImmutableJson,
} = tools;

const {values, positionals} = parseCli({
  usage: 'npm run prepare:content -- [<slug>|<path>] [--all] [--json]',
  options: {...CONTENT_OPTIONS, json: {type: 'boolean', default: false}},
});

const prepared = [];

let targets;
try {
  targets = await selectTargets(values, positionals, tools);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

// Asking for one video by name and getting a draft is an error worth stopping
// for. Meeting a draft while sweeping the whole catalog is not: it must not stop
// the approved videos around it from being prepared.
const explicit = isExplicitTarget(values, positionals);

const timingFile = join(projectRoot, 'src', 'config', 'timing.json');
const timingSource = await readFile(timingFile, 'utf8');
const timing = JSON.parse(timingSource);
const assetLicenseFile = join(projectRoot, 'asset-licenses.json');
const assetLicenseSource = await readFile(assetLicenseFile, 'utf8');
const outputDirectory = join(projectRoot, 'work', 'manifests');
await mkdir(outputDirectory, {recursive: true});

for (const target of targets) {
  const file = target.file;
  const source = await readFile(file, 'utf8');
  const content = JSON.parse(source);
  const result = await validateContent(content);

  // A failure here is an expected outcome of asking for work that is not ready,
  // not a crash, so it is reported as a message rather than an exception: a
  // stack trace would bury the reason under this script's own internals.
  if (result.errors.length > 0) {
    if (explicit) {
      console.error(`${relativeToProject(file)} failed validation:`);
      result.errors.forEach((error) => console.error(`  - ${error}`));
      process.exit(1);
    }
    console.error(`INVALID ${relativeToProject(file)} (skipped)`);
    process.exitCode = 1;
    continue;
  }
  if (content.review.status !== 'approved') {
    if (explicit) {
      console.error(
        `${relativeToProject(file)} needs human approval before manifest preparation.`,
      );
      process.exit(1);
    }
    console.log(`SKIPPED ${relativeToProject(file)} (draft)`);
    continue;
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
  prepared.push({
    contentId: content.id,
    manifest: relativeToProject(output),
    durationInFrames,
    created,
  });
}

if (values.json) {
  console.log(`RESULT ${JSON.stringify({prepared})}`);
}
