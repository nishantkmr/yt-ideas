import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {CONTENT_OPTIONS, isExplicitTarget, parseCli} from './cli.mjs';
import {projectRoot, resolveContentTarget} from './content-tools.mjs';

// The front door for `npm run validate:content`, because npm cannot forward
// `--` arguments into a chained command: in `a.mjs && b.mjs` a trailing slug
// lands on b, so the validator silently ran catalog-wide and one draft bundle
// failed the whole approved catalog.
//
// The two checks also want the slug in different shapes, which is the other
// reason a shell chain cannot express this: the validator takes a target, while
// the audit is always catalog-wide and takes --focus to decide which findings
// block. This mirrors what scripts/make-video.mjs does for steps 1 and 2.

const {values, positionals} = parseCli({
  usage:
    'npm run validate:content -- [<slug>|<path>] [--all] [--stage=structural|strict] [--json]',
  options: {
    ...CONTENT_OPTIONS,
    stage: {type: 'string', default: 'strict'},
    json: {type: 'boolean', default: false},
  },
});

let slug;
if (isExplicitTarget(values, positionals)) {
  try {
    slug = (await resolveContentTarget(values.content ?? positionals[0])).slug;
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

const passthrough = [`--stage=${values.stage}`, ...(values.json ? ['--json'] : [])];

const run = (name, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(projectRoot, 'scripts', name), ...args], {
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });

const validateCode = await run('validate-content.mjs', [
  ...(slug === undefined ? ['--all'] : [slug]),
  ...passthrough,
]);

const auditCode = await run('audit-catalog.mjs', [
  ...(slug === undefined ? [] : [`--focus=${slug}`]),
  ...(values.json ? ['--json'] : []),
]);

process.exitCode = validateCode || auditCode;
