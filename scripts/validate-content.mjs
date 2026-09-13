import {CONTENT_OPTIONS, parseCli, selectTargets} from './cli.mjs';
import * as tools from './content-tools.mjs';

const {readJson, relativeToProject, validateContent} = tools;

const {values, positionals} = parseCli({
  usage:
    'npm run validate:content -- [<slug>|<path>] [--all] [--stage=structural|strict] [--json]',
  options: {
    ...CONTENT_OPTIONS,
    stage: {type: 'string', default: 'strict'},
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

const results = [];
let failureCount = 0;

for (const target of targets) {
  const content = await readJson(target.file);
  const result = await validateContent(content, {stage: values.stage});
  const label = relativeToProject(target.file);
  results.push({slug: target.slug, id: target.id, label, ...result});

  if (result.errors.length === 0) {
    console.log(`PASS ${label} (${result.kind}, ${content.review.status})`);
  } else {
    failureCount += result.errors.length;
    console.error(`FAIL ${label}`);
    result.errors.forEach((error) => console.error(`  - ${error}`));
  }

  result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

if (values.json) {
  console.log(
    `RESULT ${JSON.stringify({
      stage: values.stage,
      files: results.length,
      errors: failureCount,
      warnings: results.reduce((total, entry) => total + entry.warnings.length, 0),
      kinds: [...new Set(results.map((entry) => entry.kind))],
      statuses: results.map((entry) => ({slug: entry.slug, errors: entry.errors.length})),
    })}`,
  );
}

if (failureCount > 0) {
  console.error(`Content validation failed with ${failureCount} error(s).`);
  process.exitCode = 1;
} else {
  console.log(
    targets.length === 1
      ? `${results[0].label} passed validation.`
      : 'All content files passed validation.',
  );
}
