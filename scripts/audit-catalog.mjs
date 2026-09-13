import {rename, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseCli} from './cli.mjs';
import {
  discoverContentFiles,
  projectRoot,
  readJson,
  relativeToProject,
  resolveContentTarget,
} from './content-tools.mjs';

// The audit always reads the whole catalog: duplicate ids, repeated question
// text and theme over-concentration are cross-video properties that cannot be
// seen from one file. --focus says which video is being built right now, so
// findings that involve it block the build while unrelated catalog debt is
// reported without stopping an unrelated render.
const {values} = parseCli({
  usage: 'npm run audit:catalog -- [--focus=<slug>] [--write-report] [--json]',
  options: {
    focus: {type: 'string'},
    'write-report': {type: 'boolean', default: false},
    json: {type: 'boolean', default: false},
  },
});

let focusLabel;
if (values.focus !== undefined) {
  try {
    focusLabel = relativeToProject((await resolveContentTarget(values.focus)).file);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

const normalize = (value) => value
  .toLocaleLowerCase('en')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const shingles = (value, size = 3) => {
  const words = normalize(value).split(' ').filter(Boolean);
  if (words.length <= size) return new Set([words.join(' ')]);
  return new Set(words.slice(0, words.length - size + 1).map((_, index) => words.slice(index, index + size).join(' ')));
};

const similarity = (left, right) => {
  const a = shingles(left);
  const b = shingles(right);
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const files = await discoverContentFiles();
const entries = await Promise.all(files.map(async (file) => ({file, content: await readJson(file)})));
const warnings = [];
const errors = [];
const seenIds = new Map();
const seenQuestions = new Map();
const creativeFields = ['hook', 'learningGoal', 'signatureMoment'];

// Findings carry the files they came from so --focus can tell which ones block
// the video currently being built.
const finding = (message, ...sources) => ({message, sources});

for (const {file, content} of entries) {
  const label = relativeToProject(file);
  if (seenIds.has(content.id)) errors.push(finding(`${label} duplicates content id ${content.id} from ${seenIds.get(content.id)}.`, label, seenIds.get(content.id)));
  else seenIds.set(content.id, label);

  if (Array.isArray(content.questions) && content.questions.length >= 8) {
    const types = new Set(content.questions.map((question) => question.type));
    const difficulties = new Set(content.questions.map((question) => question.difficulty));
    if (types.size < 3) warnings.push(finding(`${label} uses only ${types.size} question formats; use at least 3.`, label));
    if (difficulties.size < 3) warnings.push(finding(`${label} has a narrow difficulty curve.`, label));
  }
  if (Array.isArray(content.questions)) {
    for (const question of content.questions) {
      const fingerprint = normalize(
        question.clues?.length
          ? `${question.question} ${question.clues.join(' ')}`
          : question.question,
      );
      if (seenQuestions.has(fingerprint)) {
        const previous = seenQuestions.get(fingerprint);
        errors.push(finding(`${question.id} duplicates the question text used by ${previous.questionId}.`, label, previous.label));
      } else {
        seenQuestions.set(fingerprint, {questionId: question.id, label});
      }
    }
  }
}

for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
    const left = entries[leftIndex];
    const right = entries[rightIndex];
    const leftLabel = relativeToProject(left.file);
    const rightLabel = relativeToProject(right.file);
    for (const field of creativeFields) {
      const score = similarity(left.content.creative?.[field] ?? '', right.content.creative?.[field] ?? '');
      if (score >= 0.72) {
        warnings.push(finding(`${leftLabel} and ${rightLabel} have similar creative.${field} (${score.toFixed(2)}).`, leftLabel, rightLabel));
      }
    }

    const leftQuestions = Array.isArray(left.content.questions) ? left.content.questions : [];
    const rightQuestions = Array.isArray(right.content.questions) ? right.content.questions : [];
    for (const leftQuestion of leftQuestions) {
      for (const rightQuestion of rightQuestions) {
        const score = similarity(leftQuestion.question, rightQuestion.question);
        if (score >= 0.82) {
          warnings.push(finding(`Near-duplicate questions: ${leftQuestion.id} and ${rightQuestion.id} (${score.toFixed(2)}).`, leftLabel, rightLabel));
        }
      }
    }
  }
}

const approved = entries.filter(({content}) => content.review?.status === 'approved');
const themeCounts = Object.groupBy(approved, ({content}) => content.creative?.visualTheme ?? 'missing');
const formatCounts = Object.groupBy(approved, ({content}) => content.creative?.presentationFormat ?? 'missing');
if (approved.length >= 5) {
  // Concentration findings are catalog-wide properties, so they list every
  // approved file and therefore always involve whichever video is in focus.
  const approvedLabels = approved.map(({file}) => relativeToProject(file));
  for (const [theme, items] of Object.entries(themeCounts)) {
    if (items.length / approved.length > 0.6) warnings.push(finding(`${Math.round(items.length / approved.length * 100)}% of approved content uses the ${theme} theme.`, ...approvedLabels));
  }
  for (const [format, items] of Object.entries(formatCounts)) {
    if (items.length / approved.length > 0.6) warnings.push(finding(`${Math.round(items.length / approved.length * 100)}% of approved content uses the ${format} format.`, ...approvedLabels));
  }
}

const involvesFocus = (entry) => focusLabel === undefined || entry.sources.includes(focusLabel);
const blockingErrors = errors.filter(involvesFocus);
const unrelatedErrors = errors.filter((entry) => !involvesFocus(entry));
const focusedWarnings = warnings.filter(involvesFocus);
const unrelatedWarnings = warnings.filter((entry) => !involvesFocus(entry));

const report = {
  generatedAt: new Date().toISOString(),
  filesAudited: entries.length,
  approvedFiles: approved.length,
  focus: focusLabel ?? null,
  errors: errors.map((entry) => entry.message),
  warnings: warnings.map((entry) => entry.message),
  inventory: entries.map(({file, content}) => ({
    source: relativeToProject(file),
    id: content.id,
    kind: Array.isArray(content.questions) ? 'episode' : 'short',
    category: content.category ?? 'uncategorized',
    visualTheme: content.creative?.visualTheme,
    presentationFormat: content.creative?.presentationFormat,
  })),
};

let reportFile;
if (values['write-report']) {
  reportFile = join(projectRoot, 'outputs', 'catalog-audit.json');
  const temporary = `${reportFile}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`);
  await rename(temporary, reportFile);
}

blockingErrors.forEach((entry) => console.error(`ERROR ${entry.message}`));
focusedWarnings.forEach((entry) => console.warn(`WARN ${entry.message}`));
unrelatedErrors.forEach((entry) => console.error(`WARN (elsewhere) ${entry.message}`));
unrelatedWarnings.forEach((entry) => console.warn(`WARN (elsewhere) ${entry.message}`));

const unrelated = unrelatedErrors.length + unrelatedWarnings.length;
console.log(
  `Catalog audit: ${entries.length} files, ${blockingErrors.length} errors, ${focusedWarnings.length} warnings` +
    (focusLabel === undefined ? '.' : `, ${unrelated} unrelated finding(s) elsewhere in the catalog.`),
);
if (reportFile) console.log(`Report: ${relativeToProject(reportFile)}`);

if (values.json) {
  console.log(
    `RESULT ${JSON.stringify({
      focus: focusLabel ?? null,
      files: entries.length,
      errors: blockingErrors.length,
      warnings: focusedWarnings.length,
      unrelated: unrelatedErrors.length + unrelatedWarnings.length,
      messages: blockingErrors.map((entry) => entry.message),
    })}`,
  );
}

if (blockingErrors.length > 0) process.exitCode = 1;
