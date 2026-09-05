import {discoverContentFiles, readJson, relativeToProject, validateContent} from './content-tools.mjs';

let failureCount = 0;

for (const file of await discoverContentFiles()) {
  const content = await readJson(file);
  const result = await validateContent(content);
  const label = relativeToProject(file);

  if (result.errors.length === 0) {
    console.log(`PASS ${label} (${result.kind}, ${content.review.status})`);
  } else {
    failureCount += result.errors.length;
    console.error(`FAIL ${label}`);
    result.errors.forEach((error) => console.error(`  - ${error}`));
  }

  result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

if (failureCount > 0) {
  console.error(`Content validation failed with ${failureCount} error(s).`);
  process.exitCode = 1;
} else {
  console.log('All content files passed validation.');
}
