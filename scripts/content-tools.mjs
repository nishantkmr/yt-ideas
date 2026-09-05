import {createHash} from 'node:crypto';
import {access, readFile, readdir} from 'node:fs/promises';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dataRoot = join(projectRoot, 'src', 'data');
export const publicRoot = join(projectRoot, 'public');

const questionTypes = new Set([
  'multiple-choice',
  'guess-picture',
  'who-am-i',
  'true-false',
]);
const visualThemes = new Set(['jungle', 'cosmic', 'ocean', 'atlas', 'workshop']);
const presentationFormats = new Set(['classic', 'expedition', 'mystery', 'lab', 'world-tour']);

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const normalized = (value) => value.trim().toLocaleLowerCase('en');

export const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const timing = await readJson(join(projectRoot, 'src', 'config', 'timing.json'));
const assetLicenseRegistry = await readJson(join(projectRoot, 'asset-licenses.json'));
const assetLicenseByPath = new Map();
const assetLicenseRegistryErrors = [];

if (assetLicenseRegistry?.schemaVersion !== 1 || !Array.isArray(assetLicenseRegistry?.assets)) {
  assetLicenseRegistryErrors.push('asset-licenses.json must use schemaVersion 1 and contain assets[].');
} else {
  for (const [index, entry] of assetLicenseRegistry.assets.entries()) {
    const label = `asset-licenses.json assets[${index}]`;
    if (!isText(entry?.path)) {
      assetLicenseRegistryErrors.push(`${label}.path is required.`);
      continue;
    }
    if (assetLicenseByPath.has(entry.path)) {
      assetLicenseRegistryErrors.push(`${label}.path is duplicated: ${entry.path}`);
      continue;
    }
    for (const field of ['type', 'source', 'provenance', 'license', 'licenseUrl']) {
      if (!isText(entry[field])) assetLicenseRegistryErrors.push(`${label}.${field} is required.`);
    }
    if (entry.commercialUse !== 'verified') {
      assetLicenseRegistryErrors.push(`${label}.commercialUse must be "verified".`);
    }
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      assetLicenseRegistryErrors.push(`${label}.sha256 must be a lowercase SHA-256 hash.`);
    }
    assetLicenseByPath.set(entry.path, entry);
  }
}

export const discoverContentFiles = async () =>
  (await readdir(dataRoot))
    .filter((file) => extname(file) === '.json')
    .sort()
    .map((file) => join(dataRoot, file));

const validateReview = (review, label, errors) => {
  if (!review || !['draft', 'approved'].includes(review.status)) {
    errors.push(`${label}.review.status must be "draft" or "approved".`);
  }

  if (review?.status === 'approved' && !isText(review.reviewedBy)) {
    errors.push(`${label}.review.reviewedBy is required when content is approved.`);
  }
  if (review?.status === 'approved') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? '')) {
      errors.push(`${label}.review.reviewedAt must use YYYY-MM-DD when content is approved.`);
    }
    for (const gate of ['factsChecked', 'rightsChecked', 'editorialChecked']) {
      if (review[gate] !== true) {
        errors.push(`${label}.review.${gate} must be true when content is approved.`);
      }
    }
  }
};

const validateCreative = (creative, errors) => {
  if (!creative || typeof creative !== 'object') {
    errors.push('creative is required.');
    return;
  }
  if (!visualThemes.has(creative.visualTheme)) {
    errors.push(`creative.visualTheme is unsupported: ${creative.visualTheme}`);
  }
  if (!presentationFormats.has(creative.presentationFormat)) {
    errors.push(`creative.presentationFormat is unsupported: ${creative.presentationFormat}`);
  }
  for (const field of ['targetAge', 'hook', 'learningGoal', 'signatureMoment']) {
    if (!isText(creative[field])) errors.push(`creative.${field} is required.`);
  }
};

const validateResearchSources = (sources, review, errors, warnings) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    const message = 'researchSources must contain at least one editorial source.';
    if (review?.status === 'approved') errors.push(message);
    else warnings.push(message);
    return;
  }
  sources.forEach((source, index) => {
    const label = `researchSources[${index}]`;
    if (!isText(source?.title)) errors.push(`${label}.title is required.`);
    if (!isText(source?.url) || !source.url.startsWith('https://')) {
      errors.push(`${label}.url must be an HTTPS URL.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source?.accessedOn ?? '')) {
      errors.push(`${label}.accessedOn must use YYYY-MM-DD.`);
    }
  });
};

export const narrationCueNames = (content, kind) =>
  kind === 'episode'
    ? [
        'intro',
        ...content.questions.flatMap((question) => [
          `${question.id}-question`,
          `${question.id}-answer`,
        ]),
        'outro',
      ]
    : ['intro', 'clue-1', 'clue-2', 'answer', 'fact', 'outro'];

const narrationCueLimit = (kind, cue) => {
  if (kind === 'episode') {
    if (cue === 'intro' || cue === 'outro') return timing.episode[cue];
    if (cue.endsWith('-question')) return timing.episode.question;
    return timing.episode.answer;
  }
  if (cue.startsWith('clue-')) return timing.short.clue;
  return timing.short[cue];
};

const readWavDurationSeconds = (buffer) => {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let offset = 12;
  let byteRate;
  let dataSize;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunk === 'fmt ' && size >= 12) byteRate = buffer.readUInt32LE(offset + 16);
    if (chunk === 'data') dataSize = size;
    offset += 8 + size + (size % 2);
  }
  if (!byteRate || dataSize === undefined) throw new Error('missing WAV data');
  return dataSize / byteRate;
};

const readMp3DurationSeconds = (buffer) => {
  const mpeg1Bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const mpeg2Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const baseSampleRates = [44100, 48000, 32000];
  let offset = 0;
  let duration = 0;
  let frames = 0;

  while (offset + 4 <= buffer.length) {
    const header = buffer.readUInt32BE(offset);
    if ((header >>> 21) !== 0x7ff) {
      offset += 1;
      continue;
    }
    const version = (header >>> 19) & 0x3;
    const layer = (header >>> 17) & 0x3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 0x3;
    const padding = (header >>> 9) & 0x1;
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
      offset += 1;
      continue;
    }

    const isMpeg1 = version === 3;
    const bitrate = (isMpeg1 ? mpeg1Bitrates : mpeg2Bitrates)[bitrateIndex] * 1000;
    const sampleRate = baseSampleRates[sampleRateIndex] / (version === 2 ? 2 : version === 0 ? 4 : 1);
    const frameLength = Math.floor((isMpeg1 ? 144 : 72) * bitrate / sampleRate) + padding;
    if (frameLength <= 0 || offset + frameLength > buffer.length) break;
    duration += (isMpeg1 ? 1152 : 576) / sampleRate;
    frames += 1;
    offset += frameLength;
  }
  if (frames === 0) throw new Error('no MP3 frames found');
  return duration;
};

const readAudioDurationSeconds = async (file) => {
  const buffer = await readFile(file);
  const extension = extname(file).toLowerCase();
  if (extension === '.wav') return readWavDurationSeconds(buffer);
  if (extension === '.mp3') return readMp3DurationSeconds(buffer);
  throw new Error(`unsupported audio format: ${extension}`);
};

const validateAssetRights = async (relativeAsset, label, errors) => {
  const entry = assetLicenseByPath.get(relativeAsset);
  if (!entry) {
    errors.push(`${label}.visual has no rights record in asset-licenses.json: ${relativeAsset}`);
    return;
  }
  if (entry.commercialUse !== 'verified') {
    errors.push(`${label}.visual is not verified for commercial use: ${relativeAsset}`);
    return;
  }

  const assetPath = resolve(publicRoot, relativeAsset);
  try {
    const actualHash = sha256(await readFile(assetPath));
    if (actualHash !== entry.sha256) {
      errors.push(
        `${label}.visual does not match its licensed SHA-256 hash: ${relativeAsset}`,
      );
    }
  } catch {
    // The visual existence check reports the missing file with a more specific message.
  }
};

const validateNarration = async (content, kind, errors, warnings) => {
  const narration = content?.narration;
  if (!narration) {
    warnings.push('Narration is not configured.');
    return;
  }
  if (typeof narration.enabled !== 'boolean') {
    errors.push('narration.enabled must be true or false.');
  }
  if (!['edge-neural', 'windows-sapi', 'kokoro-local', 'sarvam-bulbul-v3'].includes(narration.provider)) {
    errors.push('narration.provider is unsupported.');
  }
  if (!['mp3', 'wav'].includes(narration.format)) {
    errors.push('narration.format must be "mp3" or "wav".');
  }
  if (!isText(narration.voice) || !isText(narration.audioBase)) {
    errors.push('narration needs non-empty voice and audioBase values.');
    return;
  }
  if (!narration.enabled) return;

  await Promise.all(
    narrationCueNames(content, kind).map(async (cue) => {
      const relativeAsset = `${narration.audioBase}/${cue}.${narration.format}`;
      const assetPath = resolve(publicRoot, relativeAsset);
      if (!assetPath.startsWith(`${publicRoot}${sep}`)) {
        errors.push('narration.audioBase must stay inside public/.');
        return;
      }
      try {
        await access(assetPath);
        const duration = await readAudioDurationSeconds(assetPath);
        const limit = narrationCueLimit(kind, cue);
        if (duration > limit) {
          errors.push(
            `Narration cue ${relativeAsset} is ${duration.toFixed(2)}s but its scene is ${limit}s.`,
          );
        }
      } catch {
        errors.push(`Narration asset is missing or invalid: ${relativeAsset}`);
      }
    }),
  );
};

const validateVisual = async (visual, label, errors) => {
  if (!visual || !['picture', 'silhouette'].includes(visual.type)) {
    errors.push(`${label}.visual.type must be "picture" or "silhouette".`);
    return;
  }

  if (!isText(visual.asset) || !isText(visual.alt)) {
    errors.push(`${label}.visual needs non-empty asset and alt text.`);
    return;
  }

  const assetPath = resolve(publicRoot, visual.asset);
  if (!assetPath.startsWith(`${publicRoot}${sep}`)) {
    errors.push(`${label}.visual.asset must stay inside public/.`);
    return;
  }

  try {
    await access(assetPath);
    await validateAssetRights(visual.asset, label, errors);
  } catch {
    errors.push(`${label}.visual.asset does not exist: ${visual.asset}`);
  }
};

const validateQuestion = async (question, index, ids, errors) => {
  const label = `questions[${index}]`;
  if (!isText(question?.id)) {
    errors.push(`${label}.id is required.`);
  } else if (ids.has(question.id)) {
    errors.push(`${label}.id is duplicated: ${question.id}`);
  } else {
    ids.add(question.id);
  }

  if (!questionTypes.has(question?.type)) {
    errors.push(`${label}.type is unsupported: ${question?.type}`);
  }
  if (![1, 2, 3, 4].includes(question?.difficulty)) {
    errors.push(`${label}.difficulty must be 1, 2, 3, or 4.`);
  }
  for (const field of ['question', 'answer', 'explanation']) {
    if (!isText(question?.[field])) errors.push(`${label}.${field} is required.`);
  }

  if (question?.type === 'who-am-i') {
    if (!Array.isArray(question.clues) || question.clues.length < 2 || !question.clues.every(isText)) {
      errors.push(`${label}.clues must contain at least two non-empty clues.`);
    }
  } else {
    if (!Array.isArray(question?.options) || question.options.length < 2 || !question.options.every(isText)) {
      errors.push(`${label}.options must contain at least two non-empty choices.`);
    } else {
      const normalizedOptions = question.options.map(normalized);
      if (new Set(normalizedOptions).size !== normalizedOptions.length) {
        errors.push(`${label}.options must be unique.`);
      }
      if (isText(question.answer) && !normalizedOptions.includes(normalized(question.answer))) {
        errors.push(`${label}.answer must match one of its options.`);
      }
    }
  }

  if (
    question?.type === 'true-false' &&
    Array.isArray(question.options) &&
    question.options.every(isText) &&
    JSON.stringify(question.options?.map(normalized).sort()) !== JSON.stringify(['false', 'true'])
  ) {
    errors.push(`${label}.options must be exactly True and False.`);
  }

  if (question?.visual !== undefined) {
    await validateVisual(question.visual, label, errors);
  }
};

export const validateContent = async (content) => {
  const errors = [...assetLicenseRegistryErrors];
  const warnings = [];
  const kind = Array.isArray(content?.questions) ? 'episode' : 'short';

  if (!isText(content?.id)) errors.push('id is required.');
  validateReview(content?.review, kind, errors);
  validateCreative(content?.creative, errors);
  validateResearchSources(content?.researchSources, content?.review, errors, warnings);
  await validateAssetRights('assets/quiz-owl.png', 'mascot', errors);

  if (kind === 'episode') {
    for (const field of ['title', 'category', 'theme']) {
      if (!isText(content?.[field])) errors.push(`${field} is required.`);
    }
    if (content.questions.length === 0) errors.push('questions must not be empty.');
    const ids = new Set();
    await Promise.all(
      content.questions.map((question, index) => validateQuestion(question, index, ids, errors)),
    );
  } else {
    if (!['guess-animal', 'two-clue'].includes(content?.type)) {
      errors.push('type must be "guess-animal" or "two-clue".');
    }
    if (!isText(content?.answer) || !isText(content?.funFact)) {
      errors.push('answer and funFact are required.');
    }
    if (![1, 2, 3, 4].includes(content?.difficulty)) {
      errors.push('difficulty must be 1, 2, 3, or 4.');
    }
    if (!Array.isArray(content?.clues) || content.clues.length !== 2 || !content.clues.every(isText)) {
      errors.push('clues must contain exactly two non-empty clues.');
    }
    await validateVisual(content?.visual, 'short', errors);
  }

  if (content?.review?.status === 'draft') {
    warnings.push('Content is structurally valid but still needs human approval.');
  }

  await validateNarration(content, kind, errors, warnings);

  return {kind, errors, warnings};
};

export const relativeToProject = (file) => relative(projectRoot, file).replaceAll('\\', '/');
