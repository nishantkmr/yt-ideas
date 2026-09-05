import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {discoverContentFiles, projectRoot, readJson, relativeToProject} from './content-tools.mjs';

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

for (const {file, content} of entries) {
  const label = relativeToProject(file);
  if (seenIds.has(content.id)) errors.push(`${label} duplicates content id ${content.id} from ${seenIds.get(content.id)}.`);
  else seenIds.set(content.id, label);

  if (Array.isArray(content.questions) && content.questions.length >= 8) {
    const types = new Set(content.questions.map((question) => question.type));
    const difficulties = new Set(content.questions.map((question) => question.difficulty));
    if (types.size < 3) warnings.push(`${label} uses only ${types.size} question formats; use at least 3.`);
    if (difficulties.size < 3) warnings.push(`${label} has a narrow difficulty curve.`);
  }
  if (Array.isArray(content.questions)) {
    for (const question of content.questions) {
      const fingerprint = normalize(
        question.clues?.length
          ? `${question.question} ${question.clues.join(' ')}`
          : question.question,
      );
      if (seenQuestions.has(fingerprint)) {
        errors.push(`${question.id} duplicates the question text used by ${seenQuestions.get(fingerprint)}.`);
      } else {
        seenQuestions.set(fingerprint, question.id);
      }
    }
  }
}

for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
    const left = entries[leftIndex];
    const right = entries[rightIndex];
    for (const field of creativeFields) {
      const score = similarity(left.content.creative?.[field] ?? '', right.content.creative?.[field] ?? '');
      if (score >= 0.72) {
        warnings.push(`${relativeToProject(left.file)} and ${relativeToProject(right.file)} have similar creative.${field} (${score.toFixed(2)}).`);
      }
    }

    const leftQuestions = Array.isArray(left.content.questions) ? left.content.questions : [];
    const rightQuestions = Array.isArray(right.content.questions) ? right.content.questions : [];
    for (const leftQuestion of leftQuestions) {
      for (const rightQuestion of rightQuestions) {
        const score = similarity(leftQuestion.question, rightQuestion.question);
        if (score >= 0.82) {
          warnings.push(`Near-duplicate questions: ${leftQuestion.id} and ${rightQuestion.id} (${score.toFixed(2)}).`);
        }
      }
    }
  }
}

const approved = entries.filter(({content}) => content.review?.status === 'approved');
const themeCounts = Object.groupBy(approved, ({content}) => content.creative?.visualTheme ?? 'missing');
const formatCounts = Object.groupBy(approved, ({content}) => content.creative?.presentationFormat ?? 'missing');
if (approved.length >= 5) {
  for (const [theme, items] of Object.entries(themeCounts)) {
    if (items.length / approved.length > 0.6) warnings.push(`${Math.round(items.length / approved.length * 100)}% of approved content uses the ${theme} theme.`);
  }
  for (const [format, items] of Object.entries(formatCounts)) {
    if (items.length / approved.length > 0.6) warnings.push(`${Math.round(items.length / approved.length * 100)}% of approved content uses the ${format} format.`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  filesAudited: entries.length,
  approvedFiles: approved.length,
  errors,
  warnings,
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
if (process.argv.includes('--write-report')) {
  reportFile = join(projectRoot, 'outputs', 'catalog-audit.json');
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
}

errors.forEach((error) => console.error(`ERROR ${error}`));
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
console.log(`Catalog audit: ${entries.length} files, ${errors.length} errors, ${warnings.length} warnings.`);
if (reportFile) console.log(`Report: ${relativeToProject(reportFile)}`);
if (errors.length > 0) process.exitCode = 1;
