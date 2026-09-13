import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {CONTENT_OPTIONS, parseCli, selectTargets} from './cli.mjs';
import * as tools from './content-tools.mjs';
import {buildCueSheet, cueSheetPath} from './narration-cues.mjs';

const {readJson, projectRoot, relativeToProject} = tools;

// Node decides what to narrate and what it should say; Python only turns that
// text into audio. Keeping the content model on this side is what lets narration
// wording live with the content instead of inside the synthesiser.
const {values, positionals} = parseCli({
  usage:
    'npm run generate:voiceover -- [<slug>|<path>] [--all] [--force] [--dry-run] ' +
    '[--strict-cache] [--adopt-existing] [--prune]',
  options: {
    ...CONTENT_OPTIONS,
    force: {type: 'boolean', default: false},
    'dry-run': {type: 'boolean', default: false},
    'strict-cache': {type: 'boolean', default: false},
    'adopt-existing': {type: 'boolean', default: false},
    prune: {type: 'boolean', default: false},
    json: {type: 'boolean', default: false},
  },
});

let targets;
try {
  targets = await selectTargets(values, positionals, tools);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const sheetFiles = [];
for (const target of targets) {
  const content = await readJson(target.file);
  const narration = content.narration;
  if (!narration?.enabled) {
    console.log(`SKIP ${target.slug} (narration disabled)`);
    continue;
  }
  if (narration.provider !== 'sarvam-bulbul-v3') {
    console.log(`SKIP ${target.slug} (provider is ${narration.provider})`);
    continue;
  }

  const sheet = buildCueSheet(content, target.kind);
  const file = cueSheetPath(sheet);
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, `${JSON.stringify(sheet, null, 2)}\n`);
  sheetFiles.push(file);
  console.log(`CUES ${relativeToProject(file)} (${sheet.cues.length} cues)`);
}

if (sheetFiles.length === 0) {
  console.log('Nothing to narrate.');
  process.exit(0);
}

const python =
  process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const args = [
  join(projectRoot, 'scripts', 'generate-sarvam-voiceover.py'),
  ...sheetFiles.flatMap((file) => ['--cues', file]),
  '--json',
];
for (const flag of ['force', 'dry-run', 'strict-cache', 'adopt-existing', 'prune']) {
  if (values[flag]) args.push(`--${flag}`);
}

const exitCode = await new Promise((resolvePromise) => {
  const child = spawn(python, args, {cwd: projectRoot, stdio: 'inherit'});
  child.on('error', (error) => {
    if (error.code === 'ENOENT') {
      console.error(
        `Could not run "${python}". Install Python 3.10 or newer, or set PYTHON to its path.`,
      );
      resolvePromise(127);
      return;
    }
    console.error(error.message);
    resolvePromise(1);
  });
  child.on('exit', (code) => resolvePromise(code ?? 1));
});

process.exitCode = exitCode;
