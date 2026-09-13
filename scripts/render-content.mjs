import {spawn} from 'node:child_process';
import {access, readFile} from 'node:fs/promises';
import {extname, join, resolve, sep} from 'node:path';
import {
  dataRoot,
  projectRoot,
  relativeToProject,
  sha256,
  validateContent,
  writeImmutableJson,
} from './content-tools.mjs';

const args = process.argv.slice(2);
const sourceArgument = args.find((arg) => !arg.startsWith('--'));
const force = args.includes('--force');
const checkOnly = args.includes('--check');
const preview = args.includes('--preview');
const browserExecutableArgument = args.find((arg) => arg.startsWith('--browser-executable='));

if (!sourceArgument) {
  console.error('Usage: npm run render:content -- src/data/<content>.json [--check] [--preview] [--force] [--browser-executable=<path>]');
  process.exit(1);
}

const sourceFile = resolve(projectRoot, sourceArgument);
if (!sourceFile.startsWith(`${dataRoot}${sep}`) || extname(sourceFile) !== '.json') {
  throw new Error('Content source must be a JSON file inside src/data/.');
}

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
  throw new Error(`${relativeToProject(sourceFile)} failed validation:\n- ${validation.errors.join('\n- ')}`);
}
if (!preview && content.review.status !== 'approved') {
  throw new Error(`${relativeToProject(sourceFile)} must be human-approved before rendering.`);
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
if (!force) {
  try {
    await access(outputFile);
    throw new Error(`${relativeToProject(outputFile)} already exists. Add --force to replace it.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const propsFile = join(projectRoot, 'outputs', `${preview ? 'preview-' : ''}render-props-${content.id}-${sourceHash.slice(0, 12)}.json`);
await writeImmutableJson(propsFile, renderContent);

console.log(`${preview ? 'Rendering voiceover-free draft preview' : 'Rendering approved production video'}: ${relativeToProject(sourceFile)}`);
console.log(`Immutable props: ${relativeToProject(propsFile)}`);
console.log(`Output: ${relativeToProject(outputFile)}`);

const remotionCli = join(projectRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const renderArgs = [remotionCli, 'render', 'src/index.ts', composition, outputFile, '--props', propsFile];
if (browserExecutableArgument) renderArgs.push(browserExecutableArgument);

// Long, audio-heavy episode renders can race while parallel chunks share and
// clean Remotion's temporary audio-mixing directory on Windows. Shorts finish
// in a single pass, while episodes use the safer serial encoding path.
if (kind === 'episode') {
  renderArgs.push('--disallow-parallel-encoding');
}

const child = spawn(
  process.execPath,
  renderArgs,
  {cwd: projectRoot, stdio: 'inherit'},
);

child.on('error', (error) => {
  throw error;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
