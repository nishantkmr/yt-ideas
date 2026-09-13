import {spawn} from 'node:child_process';
import {access, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CONTENT_OPTIONS, parseCli} from './cli.mjs';
import {syncContentMedia} from './content-media.mjs';
import {
  projectRoot,
  relativeToProject,
  resolveContentTarget,
  sha256,
  validateContent,
  writeImmutableJson,
} from './content-tools.mjs';
import {episodeDurationInFrames, shortDurationInFrames} from '../src/config/durations.mjs';

const {values, positionals} = parseCli({
  usage:
    'npm run render:content -- <slug>|<path> [--check] [--preview] [--force] [--browser-executable=<path>]',
  options: {
    ...CONTENT_OPTIONS,
    check: {type: 'boolean', default: false},
    preview: {type: 'boolean', default: false},
    force: {type: 'boolean', default: false},
    'browser-executable': {type: 'string'},
  },
});

const force = values.force;
const checkOnly = values.check;
const preview = values.preview;
const browserExecutable = values['browser-executable'];

const sourceArgument = values.content ?? positionals[0];
if (sourceArgument === undefined) {
  console.error(
    'Usage: npm run render:content -- <slug>|<path> [--check] [--preview] [--force] [--browser-executable=<path>]',
  );
  process.exit(1);
}

let target;
try {
  target = await resolveContentTarget(sourceArgument);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
const sourceFile = target.file;

const source = await readFile(sourceFile, 'utf8');
const content = JSON.parse(source);
const renderContent = preview
  ? {
      ...content,
      narration: content.narration
        ? {...content.narration, enabled: false}
        : undefined,
    }
  : content;
const validation = await validateContent(renderContent);
if (validation.errors.length > 0) {
  console.error(`${relativeToProject(sourceFile)} failed validation:`);
  validation.errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
if (!preview && content.review.status !== 'approved') {
  console.error(`${relativeToProject(sourceFile)} must be human-approved before rendering.`);
  process.exit(1);
}

if (checkOnly) {
  const readiness = preview ? `voiceover-free preview, ${content.review.status}` : 'approved production render';
  console.log(`READY ${relativeToProject(sourceFile)} (${validation.kind}, ${readiness})`);
  process.exit(0);
}

const sourceHash = sha256(source);
const kind = validation.kind;
const composition = kind === 'episode' ? 'TriviaEpisode' : 'TriviaShort';
const outputFile = join(projectRoot, 'outputs', `${preview ? 'preview-' : ''}${content.id}.mp4`);
if (!force && (await access(outputFile).then(() => true, () => false))) {
  console.error(`${relativeToProject(outputFile)} already exists. Add --force to replace it.`);
  process.exit(1);
}

const propsFile = join(projectRoot, 'outputs', `${preview ? 'preview-' : ''}render-props-${content.id}-${sourceHash.slice(0, 12)}.json`);
await writeImmutableJson(propsFile, renderContent);

// Remotion can only load media from public/, so a bundle's own assets and
// narration are mirrored there immediately before the render.
if (target.layout === 'bundle') {
  const {linked, removed} = await syncContentMedia(target.slug);
  if (linked > 0 || removed > 0) {
    console.log(`Media: ${linked} linked, ${removed} removed in public/content/${target.slug}`);
  }
}

console.log(`${preview ? 'Rendering voiceover-free draft preview' : 'Rendering approved production video'}: ${relativeToProject(sourceFile)}`);
console.log(`Immutable props: ${relativeToProject(propsFile)}`);
console.log(`Output: ${relativeToProject(outputFile)}`);

const remotionCli = join(projectRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const renderArgs = [remotionCli, 'render', 'src/index.ts', composition, outputFile, '--props', propsFile];
// Remotion downloads its own Chrome Headless Shell unless it is pointed at an
// installed browser, which is the only option on a machine without that fetch.
const browser = browserExecutable ?? process.env.REMOTION_BROWSER_EXECUTABLE;
if (browser) renderArgs.push(`--browser-executable=${browser}`);

// Long, audio-heavy episode renders can race while parallel chunks share and
// clean Remotion's temporary audio-mixing directory on Windows. Shorts finish
// in a single pass, while episodes use the safer serial encoding path.
if (kind === 'episode') {
  renderArgs.push('--disallow-parallel-encoding');
}

const exitCode = await new Promise((resolvePromise, rejectPromise) => {
  const child = spawn(process.execPath, renderArgs, {cwd: projectRoot, stdio: 'inherit'});
  child.on('error', rejectPromise);
  child.on('exit', (code) => resolvePromise(code ?? 1));
});

if (exitCode !== 0) {
  process.exitCode = exitCode;
} else {
  // Written only after a successful render, so an MP4 without a stamp is the
  // signature of an interrupted run and must be treated as suspect rather than
  // reused. The source hash lets a later build tell "already rendered" from
  // "rendered before the content changed".
  const timing = JSON.parse(
    await readFile(join(projectRoot, 'src', 'config', 'timing.json'), 'utf8'),
  );
  const durationInFrames =
    kind === 'episode'
      ? episodeDurationInFrames(timing, content.questions, content.outroTimeSeconds)
      : shortDurationInFrames(timing, content.clueTimeSeconds);
  const stampFile = join(
    projectRoot,
    'outputs',
    `${preview ? 'preview-' : ''}${content.id}.render.json`,
  );
  const {version} = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
  await writeFile(
    stampFile,
    `${JSON.stringify(
      {
        contentId: content.id,
        slug: target.slug,
        kind,
        composition,
        preview,
        sourceSha256: sourceHash,
        props: relativeToProject(propsFile),
        output: relativeToProject(outputFile),
        durationInFrames,
        fps: timing.fps,
        renderedAt: new Date().toISOString(),
        studioVersion: version,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Stamp: ${relativeToProject(stampFile)}`);
}
