import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CONTENT_OPTIONS, parseCli} from './cli.mjs';
import {syncContentMedia} from './content-media.mjs';
import {projectRoot, relativeToProject, resolveContentTarget} from './content-tools.mjs';
import {episodeDurationInFrames, shortDurationInFrames} from '../src/config/durations.mjs';

// One frame instead of a whole video. A full episode render costs 20-30 minutes,
// which is far too slow to answer "does this layout look right", so visual
// iteration belongs here and in Remotion Studio. A single frame takes about ten
// seconds.
//
// Stills are deliberately ungated. They run on a draft, before approval, and
// with narration switched off, because the WAV files a scene refers to do not
// exist yet while its visuals are still being designed. Nothing here writes a
// render stamp or a manifest, so a still can never be mistaken for a shippable
// render.

const {values, positionals} = parseCli({
  usage: 'npm run still -- <slug> <frame> [<frame> ...] [--browser-executable=<path>]',
  options: {
    ...CONTENT_OPTIONS,
    'browser-executable': {type: 'string'},
  },
});

// --content=<slug> leaves every positional free to be a frame number.
const slugArgument = values.content ?? positionals[0];
const frameArguments = values.content === undefined ? positionals.slice(1) : positionals;

if (slugArgument === undefined || frameArguments.length === 0) {
  console.error('Usage: npm run still -- <slug> <frame> [<frame> ...]');
  process.exit(1);
}

const frames = frameArguments.map((argument) => {
  if (!/^\d+$/.test(argument)) {
    console.error(`Frame must be a whole number, not "${argument}".`);
    process.exit(1);
  }
  return Number(argument);
});

let target;
try {
  target = await resolveContentTarget(slugArgument);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const content = JSON.parse(await readFile(target.file, 'utf8'));
const kind = Array.isArray(content.questions) ? 'episode' : 'short';
const composition = kind === 'episode' ? 'TriviaEpisode' : 'TriviaShort';

// A frame past the end renders the last frame instead of failing, which looks
// like the scene is wrong rather than the number.
const timing = JSON.parse(await readFile(join(projectRoot, 'src', 'config', 'timing.json'), 'utf8'));
const durationInFrames =
  kind === 'episode'
    ? episodeDurationInFrames(timing, content.questions, content.outroTimeSeconds)
    : shortDurationInFrames(timing, content.clueTimeSeconds);

const beyond = frames.filter((frame) => frame >= durationInFrames);
if (beyond.length > 0) {
  console.error(
    `${target.slug} is ${durationInFrames} frames long (${(durationInFrames / timing.fps).toFixed(1)}s ` +
      `at ${timing.fps}fps), so frame ${beyond.join(', ')} does not exist. Last frame is ${durationInFrames - 1}.`,
  );
  process.exit(1);
}

// staticFile() only reaches public/, so the bundle's own media has to be in the
// mirror before Remotion asks for it.
await syncContentMedia(target.slug);

const propsFile = join(projectRoot, 'work', 'stills', `${content.id}.json`);
await mkdir(join(projectRoot, 'work', 'stills'), {recursive: true});
await writeFile(
  propsFile,
  `${JSON.stringify(
    {
      ...content,
      narration: content.narration ? {...content.narration, enabled: false} : undefined,
    },
    null,
    2,
  )}\n`,
);

const remotionCli = join(projectRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const browser = values['browser-executable'] ?? process.env.REMOTION_BROWSER_EXECUTABLE;

for (const frame of frames) {
  const outputFile = join(projectRoot, 'outputs', `qa-${target.slug}-${frame}.png`);
  const args = [
    remotionCli,
    'still',
    'src/index.ts',
    composition,
    outputFile,
    `--frame=${frame}`,
    '--props',
    propsFile,
  ];
  if (browser) args.push(`--browser-executable=${browser}`);

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, args, {cwd: projectRoot, stdio: 'inherit'});
    child.on('error', rejectPromise);
    child.on('exit', (code) => resolvePromise(code ?? 1));
  });

  if (exitCode !== 0) {
    console.error(`Frame ${frame} failed.`);
    process.exitCode = exitCode;
    break;
  }
  console.log(`STILL ${relativeToProject(outputFile)}  (${kind} frame ${frame})`);
}
