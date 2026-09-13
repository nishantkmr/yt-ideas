import {spawn} from 'node:child_process';
import {access, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {parseCli} from './cli.mjs';
import {
  projectRoot,
  readJson,
  relativeToProject,
  resolveContentTarget,
  sha256,
} from './content-tools.mjs';

// Builds one video end to end. Each step is still an ordinary script that can be
// run on its own; this only decides which of them to run, in what order, and
// whether each one has anything left to do. Steps run as child processes so a
// crash inside one cannot take the build down with it, and report structured
// results on a trailing RESULT line.

const STEP_KEYS = ['validate', 'audit', 'music', 'sfx', 'voiceover', 'manifest', 'render'];

const {values, positionals} = parseCli({
  usage:
    'npm run video -- <slug> [--preview] [--force] [--skip-voiceover] [--dry-run] ' +
    `[--from=<step>] [--browser-executable=<path>] [--quiet]\n         steps: ${STEP_KEYS.join(', ')}`,
  options: {
    content: {type: 'string', short: 'c'},
    preview: {type: 'boolean', default: false},
    force: {type: 'boolean', default: false},
    'skip-voiceover': {type: 'boolean', default: false},
    'dry-run': {type: 'boolean', default: false},
    from: {type: 'string'},
    'browser-executable': {type: 'string'},
    quiet: {type: 'boolean', default: false},
  },
});

const argument = values.content ?? positionals[0];
if (argument === undefined) {
  console.error('Usage: npm run video -- <slug> [--preview] [--force] [--dry-run]');
  process.exit(1);
}

let target;
try {
  target = await resolveContentTarget(argument);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const fromIndex = values.from === undefined ? 0 : STEP_KEYS.indexOf(values.from);
if (fromIndex < 0) {
  console.error(`Unknown step "${values.from}". Steps: ${STEP_KEYS.join(', ')}`);
  process.exit(2);
}

const content = await readJson(target.file);
const theme = content.creative?.visualTheme;
const exists = (file) => access(file).then(() => true, () => false);

class StepError extends Error {
  constructor(step, messages) {
    super(messages[0] ?? `${step} failed`);
    this.step = step;
    this.messages = messages;
  }
}

const node = process.execPath;
const script = (name) => join(projectRoot, 'scripts', name);

// Runs a step and hands back its RESULT payload. Output is echoed as it arrives
// so a long step is never silent, but indented so it reads as detail under the
// step line rather than as the build's own voice.
const runStep = async (stepKey, command, args, {inherit = false} = {}) => {
  let out = '';
  const code = await new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    if (!inherit) {
      // Every line is captured for the failure report, but only lines that
      // record real work are echoed. A step that reuses 22 cached cues should
      // say so once on its own line, not 22 times. Diagnostics are captured
      // silently and printed once by the failure report, so a failing step does
      // not say the same thing twice.
      const noise = /^(REUSED|SKIP|EXISTS|CUES|DONE|RESULT|PASS|Catalog audit:|All content)|passed validation\.$/;
      child.stdout.on('data', (chunk) => {
        out += chunk;
        if (values.quiet) return;
        const interesting = String(chunk)
          .split('\n')
          .filter((line) => line.trim() !== '' && !noise.test(line.trim()));
        if (interesting.length > 0) {
          process.stdout.write(`${interesting.map((line) => `      ${line}`).join('\n')}\n`);
        }
      });
      child.stderr.on('data', (chunk) => {
        out += chunk;
      });
    }
    child.on('error', (error) => {
      out += error.message;
      resolvePromise(error.code === 'ENOENT' ? 127 : 1);
    });
    child.on('exit', (exitCode) => resolvePromise(exitCode ?? 1));
  });

  const resultLine = out.split('\n').reverse().find((line) => line.startsWith('RESULT '));
  const result = resultLine ? JSON.parse(resultLine.slice('RESULT '.length)) : undefined;
  if (code !== 0) {
    const detail = out
      .trim()
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== '' && !/^\s*at /.test(line))
      .slice(-10);
    throw new StepError(stepKey, detail.length > 0 ? detail : [`exited with code ${code}`]);
  }
  return result;
};

const browserArgs = values['browser-executable']
  ? [`--browser-executable=${values['browser-executable']}`]
  : [];

const outputFile = join(
  projectRoot,
  'outputs',
  `${values.preview ? 'preview-' : ''}${content.id}.mp4`,
);
const stampFile = join(
  projectRoot,
  'outputs',
  `${values.preview ? 'preview-' : ''}${content.id}.render.json`,
);

// Deciding whether the video needs rendering again is the one place where a
// wrong answer is expensive in both directions: re-rendering wastes minutes,
// but skipping a stale render ships the wrong video. An output with no stamp
// is treated as an interrupted render rather than as finished work.
const renderPlan = async () => {
  if (!(await exists(outputFile))) return {status: 'run', detail: relativeToProject(outputFile)};
  if (values.force) return {status: 'run', detail: 're-render (--force)'};

  const stamp = await readJson(stampFile).catch(() => undefined);
  if (stamp === undefined) {
    return {status: 'run', detail: 'existing output has no render stamp, rebuilding'};
  }
  const currentHash = sha256(await readFile(target.file, 'utf8'));
  if (stamp.sourceSha256 === currentHash) {
    return {status: 'skip', detail: `${relativeToProject(outputFile)} is up to date`};
  }
  throw new StepError('render', [
    `${relativeToProject(outputFile)} exists but ${relativeToProject(target.file)} has changed since it was rendered.`,
    'Add --force to replace it.',
  ]);
};

const STEPS = [
  {
    key: 'validate',
    label: 'validate',
    // Structural only: the music bed and narration this video needs are
    // produced by steps further down, and the strict pass runs at 'manifest'.
    plan: () => ({status: 'run', detail: 'schema, rights and review'}),
    run: async () => {
      const result = await runStep('validate', node, [
        script('validate-content.mjs'),
        target.slug,
        '--stage=structural',
        '--json',
      ]);
      return {
        status: 'run',
        detail: `${target.kind}, ${content.review?.status}` +
          (result?.warnings ? `, ${result.warnings} warning(s)` : ''),
      };
    },
  },
  {
    key: 'audit',
    label: 'catalog audit',
    plan: () => ({status: 'run', detail: 'catalog-wide, focused on this video'}),
    run: async () => {
      const result = await runStep('audit', node, [
        script('audit-catalog.mjs'),
        `--focus=${target.slug}`,
        '--json',
      ]);
      const unrelated = result?.unrelated ?? 0;
      return {
        status: 'run',
        detail: `no duplicate questions${unrelated > 0 ? ` (${unrelated} unrelated elsewhere)` : ''}`,
      };
    },
  },
  {
    key: 'music',
    label: 'music',
    plan: async () =>
      (await exists(join(projectRoot, 'public', 'audio', 'music', `${theme}.wav`)))
        ? {status: 'skip', detail: `${theme}.wav exists`}
        : {status: 'run', detail: `generate ${theme}.wav`},
    run: async () => {
      const plan = await STEPS[2].plan();
      if (plan.status === 'skip') return plan;
      await runStep('music', node, [script('generate-music.mjs'), `--theme=${theme}`, '--json']);
      return {status: 'run', detail: `generated ${theme}.wav`};
    },
  },
  {
    key: 'sfx',
    label: 'sfx',
    plan: async () =>
      (await exists(join(projectRoot, 'public', 'audio', 'sfx', 'countdown-tick.wav')))
        ? {status: 'skip', detail: 'countdown-tick.wav exists'}
        : {status: 'run', detail: 'generate countdown-tick.wav'},
    run: async () => {
      const plan = await STEPS[3].plan();
      if (plan.status === 'skip') return plan;
      await runStep('sfx', node, [script('generate-sfx.mjs'), '--json']);
      return {status: 'run', detail: 'generated countdown-tick.wav'};
    },
  },
  {
    key: 'voiceover',
    label: 'voiceover',
    skipWhen: () =>
      !content.narration?.enabled
        ? 'narration disabled'
        : values.preview
          ? 'preview renders are voiceover-free'
          : values['skip-voiceover']
            ? '--skip-voiceover'
            : undefined,
    // The plan pass is always --dry-run --strict-cache, so asking what a build
    // would do can never reach the API.
    plan: async () => {
      const result = await runStep('voiceover', node, [
        script('generate-voiceover.mjs'),
        target.slug,
        '--dry-run',
        '--json',
      ]);
      return {
        status: 'run',
        detail: `${result?.cues ?? '?'} cues: ${result?.reused ?? 0} cached, ${result?.wouldGenerate ?? 0} to synthesise`,
      };
    },
    run: async () => {
      const result = await runStep('voiceover', node, [
        script('generate-voiceover.mjs'),
        target.slug,
        '--json',
      ]);
      return {
        status: 'run',
        detail: `${result?.cues ?? '?'} cues: ${result?.reused ?? 0} cached, ${result?.generated ?? 0} new`,
      };
    },
  },
  {
    key: 'manifest',
    label: 'manifest',
    // Skipped for previews, which are drafts by definition. This is also the
    // strict validation pass, so no production render happens without it.
    skipWhen: () => (values.preview ? 'previews are not manifested' : undefined),
    plan: () => ({status: 'run', detail: 'strict validation and hashed manifest'}),
    run: async () => {
      const result = await runStep('manifest', node, [
        script('prepare-content.mjs'),
        target.slug,
        '--json',
      ]);
      const entry = result?.prepared?.[0];
      return {status: 'run', detail: entry ? entry.manifest : 'prepared'};
    },
  },
  {
    key: 'render',
    label: 'render',
    plan: renderPlan,
    run: async () => {
      const plan = await renderPlan();
      if (plan.status === 'skip') return plan;
      const args = [script('render-content.mjs'), target.slug, ...browserArgs];
      if (values.preview) args.push('--preview');
      if (values.force || plan.detail.includes('no render stamp')) args.push('--force');
      // stdio is inherited so Remotion draws its own progress bar unmangled.
      await runStep('render', node, args, {inherit: true});
      return {status: 'run', detail: relativeToProject(outputFile)};
    },
  },
];

const started = performance.now();
const elapsed = (ms) =>
  ms < 1000 ? '' : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s`;

console.log(
  `Building ${target.slug} (${target.kind}, ${content.review?.status})` +
    `${values.preview ? ' as a voiceover-free preview' : ''}${values['dry-run'] ? ' [dry run]' : ''}`,
);
console.log(`Source: ${relativeToProject(target.file)}\n`);

for (const [index, step] of STEPS.entries()) {
  const prefix = `[${index + 1}/${STEPS.length}] ${step.label.padEnd(14)}`;
  const skipReason = index < fromIndex ? `--from=${values.from}` : step.skipWhen?.();

  if (skipReason !== undefined) {
    console.log(`${prefix}SKIP  ${skipReason}`);
    continue;
  }

  const stepStarted = performance.now();
  try {
    const result = values['dry-run'] ? await step.plan() : await step.run();
    const took = elapsed(performance.now() - stepStarted);
    const verb = result.status === 'skip' ? 'SKIP ' : values['dry-run'] ? 'PLAN ' : 'OK   ';
    console.log(`${prefix}${verb} ${result.detail}${took ? `  ${took}` : ''}`);
  } catch (error) {
    if (!(error instanceof StepError)) throw error;
    console.log(`${prefix}FAIL`);
    console.error(`\n${error.messages.map((line) => `  ${line}`).join('\n')}`);
    console.error(
      `\nFailed at step "${error.step}". After fixing, resume with:\n` +
        `  npm run video -- ${target.slug} --from=${error.step}` +
        `${values.preview ? ' --preview' : ''}${values.force ? ' --force' : ''}`,
    );
    process.exit(1);
  }
}

const total = elapsed(performance.now() - started) || '0s';
if (values['dry-run']) {
  console.log(`\nDry run complete in ${total}. Nothing was generated or rendered.`);
} else {
  const stamp = await readJson(stampFile).catch(() => undefined);
  console.log(`\nDone in ${total} -> ${relativeToProject(outputFile)}`);
  if (stamp) {
    console.log(
      `  ${(stamp.durationInFrames / stamp.fps).toFixed(1)}s (${stamp.durationInFrames} frames @ ${stamp.fps}fps)`,
    );
  }
}
