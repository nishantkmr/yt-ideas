import {spawn} from 'node:child_process';
import {access, readFile, writeFile} from 'node:fs/promises';
import {extname, join, resolve, sep} from 'node:path';
import {dataRoot, projectRoot, relativeToProject, sha256, validateContent} from './content-tools.mjs';

const args = process.argv.slice(2);
const sourceArgument = args.find((arg) => !arg.startsWith('--'));
const force = args.includes('--force');
const checkOnly = args.includes('--check');

if (!sourceArgument) {
  console.error('Usage: npm run render:content -- src/data/<content>.json [--check] [--force]');
  process.exit(1);
}

const sourceFile = resolve(projectRoot, sourceArgument);
if (!sourceFile.startsWith(`${dataRoot}${sep}`) || extname(sourceFile) !== '.json') {
  throw new Error('Content source must be a JSON file inside src/data/.');
}

const source = await readFile(sourceFile, 'utf8');
const content = JSON.parse(source);
const validation = await validateContent(content);
if (validation.errors.length > 0) {
  throw new Error(`${relativeToProject(sourceFile)} failed validation:\n- ${validation.errors.join('\n- ')}`);
}
if (content.review.status !== 'approved') {
  throw new Error(`${relativeToProject(sourceFile)} must be human-approved before rendering.`);
}

if (checkOnly) {
  console.log(`READY ${relativeToProject(sourceFile)} (${validation.kind}, approved)`);
  process.exit(0);
}

const sourceHash = sha256(source);
const kind = validation.kind;
const composition = kind === 'episode' ? 'TriviaEpisode' : 'TriviaShort';
const outputFile = join(projectRoot, 'outputs', `${content.id}.mp4`);
if (!force) {
  try {
    await access(outputFile);
    throw new Error(`${relativeToProject(outputFile)} already exists. Add --force to replace it.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const propsFile = join(projectRoot, 'outputs', `render-props-${content.id}-${sourceHash.slice(0, 12)}.json`);
try {
  await writeFile(propsFile, `${JSON.stringify(content, null, 2)}\n`, {flag: 'wx'});
} catch (error) {
  if (error?.code !== 'EEXIST') throw error;
}

console.log(`Rendering approved ${kind}: ${relativeToProject(sourceFile)}`);
console.log(`Immutable props: ${relativeToProject(propsFile)}`);
console.log(`Output: ${relativeToProject(outputFile)}`);

const remotionCli = join(projectRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const child = spawn(
  process.execPath,
  [remotionCli, 'render', 'src/index.ts', composition, outputFile, '--props', propsFile],
  {cwd: projectRoot, stdio: 'inherit'},
);

child.on('error', (error) => {
  throw error;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
