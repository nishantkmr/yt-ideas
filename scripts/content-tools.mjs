import {createHash} from 'node:crypto';
import {access, link, readFile, readdir, unlink, writeFile} from 'node:fs/promises';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  episodeAnswerSeconds,
  episodeQuestionSeconds,
} from '../src/config/durations.mjs';
import {
  FORMAT_IDS,
  QUESTION_TYPE_IDS,
  THEME_IDS,
  findFormat,
  findVisualType,
  VISUAL_TYPE_IDS,
} from '../src/packs/manifest-registry.ts';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dataRoot = join(projectRoot, 'src', 'data');
export const contentRoot = join(projectRoot, 'content');
export const publicRoot = join(projectRoot, 'public');

// The content vocabulary comes from the pack manifests, which the Remotion
// sources compile from and Node reads directly through type stripping. There is
// no second copy of these lists to keep in step.
const questionTypes = new Set(QUESTION_TYPE_IDS);
const visualThemes = new Set(THEME_IDS);
const presentationFormats = new Set(FORMAT_IDS);

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

// Writes a content-addressed artifact that must never change once it exists.
// A plain {flag:'wx'} write can leave a half-written file behind if the process
// is killed mid-write, and that truncated file would then be treated as the
// canonical artifact forever. Writing to a temporary sibling and renaming makes
// the publish atomic, and an existing file is read back and compared so a
// corrupt or diverging artifact is reported instead of silently accepted.
export const writeImmutableJson = async (file, value) => {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  const temporary = `${file}.tmp-${process.pid}`;

  try {
    await writeFile(temporary, body, {flag: 'wx'});
    // link() publishes the fully written file under its final name and fails if
    // that name is taken, so an interrupted run can never leave a partial file
    // there and a concurrent run can never overwrite one. rename() would
    // silently clobber the destination instead.
    await link(temporary, file);
    return {created: true};
  } catch (error) {
    if (error?.code !== 'EEXIST' || !(await access(file).then(() => true, () => false))) {
      throw error;
    }
  } finally {
    await unlink(temporary).catch(() => {});
  }

  const existing = await readFile(file, 'utf8');
  if (existing !== body) {
    throw new Error(
      `${relativeToProject(file)} already exists with different content. ` +
        'Its name is derived from a hash, so this means the file is corrupt or was written by an ' +
        'older version of this tool. Delete it and re-run.',
    );
  }
  return {created: false};
};

// A content target is a record rather than a bare path, so callers address a
// video by slug or id and never hard-code where its JSON lives. The index scans
// both the flat src/data/ layout and the content/<slug>/content.json bundle
// layout, which is what lets the bundle migration happen without touching a
// single command line.
let targetIndex;

const buildTargetIndex = async () => {
  const found = [];

  const bundles = await readdir(contentRoot, {withFileTypes: true}).catch(() => []);
  for (const entry of bundles) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const file = join(contentRoot, entry.name, 'content.json');
    if (!(await access(file).then(() => true, () => false))) continue;
    found.push({slug: entry.name, file, dir: join(contentRoot, entry.name), layout: 'bundle'});
  }

  const flat = (await readdir(dataRoot).catch(() => []))
    .filter((file) => extname(file) === '.json')
    .sort();
  for (const name of flat) {
    found.push({
      slug: name.slice(0, -'.json'.length),
      file: join(dataRoot, name),
      dir: dataRoot,
      layout: 'flat',
    });
  }

  return Promise.all(
    found.map(async (target) => {
      const content = await readJson(target.file);
      return {
        ...target,
        id: content.id,
        kind: Array.isArray(content?.questions) ? 'episode' : 'short',
      };
    }),
  );
};

export const listContentTargets = async () => (targetIndex ??= buildTargetIndex());

export const resolveContentTarget = async (argument) => {
  if (typeof argument !== 'string' || argument.trim() === '') {
    throw new Error('A content slug or path is required.');
  }

  const targets = await listContentTargets();
  const looksLikePath =
    argument.endsWith('.json') || argument.includes('/') || argument.includes(sep);

  if (looksLikePath) {
    const file = resolve(projectRoot, argument);
    const known = targets.find((target) => target.file === file);
    if (known) return known;
    if (!file.startsWith(`${dataRoot}${sep}`) && !file.startsWith(`${contentRoot}${sep}`)) {
      throw new Error('Content source must be a JSON file inside src/data/ or content/.');
    }
    throw new Error(`No content file at ${relativeToProject(file)}.`);
  }

  const matches = targets.filter(
    (target) => target.slug === argument || target.id === argument,
  );
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    const known = targets
      .map((target) => `  ${target.slug}${target.id === target.slug ? '' : `  (id ${target.id})`}`)
      .join('\n');
    throw new Error(`Unknown content "${argument}". Known content:\n${known}`);
  }
  throw new Error(
    `"${argument}" matches more than one content file: ` +
      `${matches.map((target) => relativeToProject(target.file)).join(', ')}. Pass an explicit path.`,
  );
};

export const discoverContentFiles = async () =>
  (await listContentTargets()).map((target) => target.file).sort();

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
    if (source?.id !== undefined && !isText(source.id)) {
      errors.push(`${label}.id must be non-empty when provided.`);
    }
    if (!isText(source?.title)) errors.push(`${label}.title is required.`);
    if (!isText(source?.url) || !source.url.startsWith('https://')) {
      errors.push(`${label}.url must be an HTTPS URL.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source?.accessedOn ?? '')) {
      errors.push(`${label}.accessedOn must use YYYY-MM-DD.`);
    }
  });
};

const validateThemeMusic = async (creative, errors) => {
  if (!visualThemes.has(creative?.visualTheme)) return;
  const relativeAsset = `audio/music/${creative.visualTheme}.wav`;
  const assetPath = resolve(publicRoot, relativeAsset);
  try {
    await access(assetPath);
    const duration = await readAudioDurationSeconds(assetPath);
    if (duration < 8) errors.push(`Theme music must be at least 8 seconds: ${relativeAsset}`);
  } catch {
    errors.push(`Theme music is missing or invalid: ${relativeAsset}`);
  }
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

const narrationCueLimit = (content, kind, cue) => {
  if (kind === 'episode') {
    if (cue === 'intro') return timing.episode.intro;
    if (cue === 'outro') return content.outroTimeSeconds ?? timing.episode.outro;
    if (cue.endsWith('-question')) {
      const questionId = cue.slice(0, -'-question'.length);
      const question = content.questions.find(({id}) => id === questionId);
      return episodeQuestionSeconds(timing, question ?? {});
    }
    const questionId = cue.slice(0, -'-answer'.length);
    const question = content.questions.find(({id}) => id === questionId);
    return episodeAnswerSeconds(timing, question ?? {});
  }
  if (cue.startsWith('clue-')) return content.clueTimeSeconds ?? timing.short.clue;
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

const validateNarration = async (content, kind, errors, warnings, {checkAssets = true} = {}) => {
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
  if (narration.script !== undefined) {
    // A key that is not a cue name would silently override nothing, so the
    // narration would stay wrong while looking customised.
    if (typeof narration.script !== 'object' || narration.script === null || Array.isArray(narration.script)) {
      errors.push('narration.script must be an object of cue name to text.');
    } else {
      const known = new Set(narrationCueNames(content, kind));
      for (const [cue, text] of Object.entries(narration.script)) {
        if (!known.has(cue)) {
          errors.push(`narration.script has no such cue: ${cue}`);
        } else if (!isText(text)) {
          errors.push(`narration.script.${cue} must be non-empty text.`);
        }
      }
    }
  }
  if (!narration.enabled) return;

  if (!resolve(publicRoot, narration.audioBase).startsWith(`${publicRoot}${sep}`)) {
    errors.push('narration.audioBase must stay inside public/.');
    return;
  }

  // The cues themselves are produced by a later pipeline step, so a structural
  // pass checks the narration configuration but not the audio on disk.
  if (!checkAssets) {
    warnings.push('Narration audio has not been generated yet (structural check only).');
    return;
  }

  await Promise.all(
    narrationCueNames(content, kind).map(async (cue) => {
      const relativeAsset = `${narration.audioBase}/${cue}.${narration.format}`;
      const assetPath = resolve(publicRoot, relativeAsset);
      try {
        await access(assetPath);
        const duration = await readAudioDurationSeconds(assetPath);
        const limit = narrationCueLimit(content, kind, cue);
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
  const registered = visual ? findVisualType(visual.type) : undefined;
  if (!registered) {
    errors.push(
      `${label}.visual.type must be one of: ${VISUAL_TYPE_IDS.map((id) => `"${id}"`).join(', ')}.`,
    );
    return;
  }

  // Rules specific to a visual live with the pack that draws it.
  errors.push(...(registered.validate?.(visual, label) ?? []));

  // Code-native visuals draw themselves, so there is no file to check or
  // license. Everything else must exist and carry verified commercial rights.
  if (!registered.requiresAsset) return;

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
  if (
    question?.readingTimeSeconds !== undefined &&
    (!Number.isInteger(question.readingTimeSeconds) ||
      question.readingTimeSeconds < timing.episode.question ||
      question.readingTimeSeconds > 15)
  ) {
    errors.push(
      `${label}.readingTimeSeconds must be a whole number from ${timing.episode.question} to 15.`,
    );
  }
  if (
    question?.answerTimeSeconds !== undefined &&
    (!Number.isInteger(question.answerTimeSeconds) ||
      question.answerTimeSeconds < timing.episode.answer ||
      question.answerTimeSeconds > 15)
  ) {
    errors.push(
      `${label}.answerTimeSeconds must be a whole number from ${timing.episode.answer} to 15.`,
    );
  }
  for (const field of ['question', 'answer', 'explanation']) {
    if (!isText(question?.[field])) errors.push(`${label}.${field} is required.`);
  }

  if (question?.sourceRefs !== undefined) {
    if (!Array.isArray(question.sourceRefs) || question.sourceRefs.length === 0 || !question.sourceRefs.every(isText)) {
      errors.push(`${label}.sourceRefs must contain at least one non-empty source ID.`);
    } else if (new Set(question.sourceRefs).size !== question.sourceRefs.length) {
      errors.push(`${label}.sourceRefs must be unique.`);
    }
  }
  if (question?.pronunciationNotes !== undefined) {
    if (!Array.isArray(question.pronunciationNotes)) {
      errors.push(`${label}.pronunciationNotes must be an array.`);
    } else {
      question.pronunciationNotes.forEach((note, noteIndex) => {
        if (!isText(note?.term) || !isText(note?.sayAs)) {
          errors.push(`${label}.pronunciationNotes[${noteIndex}] needs non-empty term and sayAs values.`);
        }
      });
    }
  }

  if (question?.type === 'ordering') {
    if (!Array.isArray(question.items) || question.items.length < 3 || question.items.length > 5 || !question.items.every(isText)) {
      errors.push(`${label}.items must contain three to five non-empty items.`);
    }
    if (!Array.isArray(question.correctOrder) || question.correctOrder.length < 3 || question.correctOrder.length > 5 || !question.correctOrder.every(isText)) {
      errors.push(`${label}.correctOrder must contain three to five non-empty items.`);
    }
    if (Array.isArray(question.items) && Array.isArray(question.correctOrder)) {
      const items = question.items.map(normalized);
      const correctOrder = question.correctOrder.map(normalized);
      if (new Set(items).size !== items.length) {
        errors.push(`${label}.items must be unique.`);
      }
      if (
        items.length !== correctOrder.length ||
        JSON.stringify([...items].sort()) !== JSON.stringify([...correctOrder].sort())
      ) {
        errors.push(`${label}.correctOrder must contain exactly the same values as items.`);
      }
    }
  } else if (question?.type === 'who-am-i') {
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

// stage: 'strict' (default) also checks assets that earlier pipeline steps are
// responsible for generating -- the theme music bed and the narration cues.
// 'structural' checks only what a human authors, so a brand new content file can
// be validated before its music and voiceover exist. Every existing caller gets
// the strict behaviour unchanged; only the first step of a full build asks for
// the structural pass, and the strict pass still runs before any production
// render because prepare-content.mjs performs it.
export const validateContent = async (content, options = {}) => {
  const stage = options.stage ?? 'strict';
  if (!['structural', 'strict'].includes(stage)) {
    throw new Error(`Unknown validation stage: ${stage}`);
  }
  const checkGenerated = stage === 'strict';

  const errors = [...assetLicenseRegistryErrors];
  const warnings = [];
  const kind = Array.isArray(content?.questions) ? 'episode' : 'short';

  if (!isText(content?.id)) errors.push('id is required.');
  validateReview(content?.review, kind, errors);
  validateCreative(content?.creative, errors);
  validateResearchSources(content?.researchSources, content?.review, errors, warnings);
  if (checkGenerated) {
    await validateThemeMusic(content?.creative, errors);
  }
  await validateAssetRights('assets/quiz-owl.png', 'mascot', errors);

  if (kind === 'episode') {
    for (const field of ['title', 'category', 'theme']) {
      if (!isText(content?.[field])) errors.push(`${field} is required.`);
    }
    if (content?.outroCallToAction !== undefined && !isText(content.outroCallToAction)) {
      errors.push('outroCallToAction must be non-empty when provided.');
    }
    if (
      content?.outroTimeSeconds !== undefined &&
      (!Number.isInteger(content.outroTimeSeconds) ||
        content.outroTimeSeconds < timing.episode.outro ||
        content.outroTimeSeconds > 15)
    ) {
      errors.push(
        `outroTimeSeconds must be a whole number from ${timing.episode.outro} to 15.`,
      );
    }
    if (content.questions.length === 0) errors.push('questions must not be empty.');
    const ids = new Set();
    await Promise.all(
      content.questions.map((question, index) => validateQuestion(question, index, ids, errors)),
    );
    // Extra rules a presentation format imposes on the whole episode, declared
    // by the pack that owns the format.
    errors.push(...(findFormat(content.creative?.presentationFormat)?.validate?.(content) ?? []));
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
    if (
      content?.clueTimeSeconds !== undefined &&
      (!Number.isInteger(content.clueTimeSeconds) ||
        content.clueTimeSeconds < timing.short.clue ||
        content.clueTimeSeconds > 10)
    ) {
      errors.push(
        `clueTimeSeconds must be a whole number from ${timing.short.clue} to 10.`,
      );
    }
    if (!Array.isArray(content?.clues) || content.clues.length !== 2 || !content.clues.every(isText)) {
      errors.push('clues must contain exactly two non-empty clues.');
    }
    await validateVisual(content?.visual, 'short', errors);
  }

  if (content?.review?.status === 'draft') {
    warnings.push('Content is structurally valid but still needs human approval.');
  }

  await validateNarration(content, kind, errors, warnings, {checkAssets: checkGenerated});

  return {kind, stage, errors, warnings};
};

export const relativeToProject = (file) => relative(projectRoot, file).replaceAll('\\', '/');
