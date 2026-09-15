import {readFile} from 'node:fs/promises';
import {CONTENT_OPTIONS, parseCli, selectTargets} from './cli.mjs';
import * as tools from './content-tools.mjs';
import {buildCueSheet} from './narration-cues.mjs';

// Does the audio say what the cue asked for?
//
// The validator already checks that every cue exists and fits its scene, which
// is a check on length alone. It cannot tell that a cue is the right length
// while containing the wrong words, and two such faults shipped in one session:
// Bulbul v3 spoke every "!" aloud as "factorial", and it sometimes repeats a
// phrase, so a Short opened with "solve this pencil mystery pencil mystery".
// Both were caught by a person listening, which does not scale to a catalog.
//
// Neither fault can be seen in the text, so this compares the audio with what
// was asked for, two ways:
//
//   - Speaking rate. Extra words make a cue slower than its word count implies.
//     "Factorial" cost about half a second every time it appeared.
//   - Speech segments against pause points. Speech is split by silence, and the
//     text says how many pauses to expect: one per sentence end and comma. More
//     blocks of speech than the text has places to pause means something was
//     said that was not written.
//
// Both are heuristics over a small sample, so this reports and never fails a
// build. It is a reason to listen to a particular cue, not a verdict on it.

const {values, positionals} = parseCli({
  usage: 'npm run narration:check -- [<slug>|<path>] [--all] [--json]',
  options: {...CONTENT_OPTIONS, json: {type: 'boolean', default: false}},
});

let targets;
try {
  targets = await selectTargets(values, positionals, tools);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

/** Mono samples and sample rate from a RIFF/WAVE file. */
const readWav = (buffer) => {
  let offset = 12;
  let dataSize;
  let dataStart;
  let channels;
  let sampleRate;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
    }
    if (id === 'data') {
      dataSize = size;
      dataStart = offset + 8;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataSize === undefined || !sampleRate) throw new Error('not a readable WAV');
  const frames = dataSize / (channels * 2);
  const samples = new Float64Array(frames);
  for (let index = 0; index < frames; index += 1) {
    samples[index] = buffer.readInt16LE(dataStart + index * channels * 2) / 32768;
  }
  return {samples, sampleRate};
};

const FRAME_SECONDS = 0.02;
/** Silence long enough to be a pause rather than a stop between syllables. */
const GAP_FRAMES = 8;

const speechSegments = (samples, sampleRate) => {
  const width = Math.round(sampleRate * FRAME_SECONDS);
  const envelope = [];
  for (let index = 0; index + width < samples.length; index += width) {
    let sum = 0;
    for (let step = 0; step < width; step += 1) sum += samples[index + step] ** 2;
    envelope.push(Math.sqrt(sum / width));
  }
  const threshold = Math.max(...envelope) * 0.06;
  const segments = [];
  let start = null;
  let quiet = 0;
  envelope.forEach((level, index) => {
    if (level >= threshold) {
      if (start === null) start = index;
      quiet = 0;
      return;
    }
    if (start === null) return;
    quiet += 1;
    if (quiet >= GAP_FRAMES) {
      segments.push([start * FRAME_SECONDS, (index - quiet) * FRAME_SECONDS]);
      start = null;
      quiet = 0;
    }
  });
  if (start !== null) segments.push([start * FRAME_SECONDS, envelope.length * FRAME_SECONDS]);
  return segments;
};

const findings = [];
const measured = [];

for (const target of targets) {
  const content = await tools.readJson(target.file);
  if (!content.narration?.enabled) continue;
  const sheet = buildCueSheet(content, target.kind);
  for (const cue of sheet.cues) {
    const file = tools.resolveMediaSource(`${content.narration.audioBase}/${cue.name}.${content.narration.format}`);
    let audio;
    try {
      audio = readWav(await readFile(file));
    } catch {
      continue; // The validator owns missing or unreadable narration.
    }
    const seconds = audio.samples.length / audio.sampleRate;
    const words = cue.text.trim().split(/\s+/).length;
    measured.push({
      slug: target.slug,
      name: cue.name,
      text: cue.text,
      seconds,
      rate: words / seconds,
      segments: speechSegments(audio.samples, audio.sampleRate).length,
      // One pause is plausible at each sentence end and each comma.
      pausePoints: (cue.text.match(/[.?]/g) ?? []).length + (cue.text.match(/,/g) ?? []).length,
    });
  }
}

if (measured.length === 0) {
  console.log('No generated narration to check.');
  process.exit(0);
}

// The catalog's own speaking rate is the baseline: it needs no tuning per voice.
const rates = measured.map((entry) => entry.rate).sort((left, right) => left - right);
const median = rates[Math.floor(rates.length / 2)];

for (const entry of measured) {
  if (entry.segments > entry.pausePoints && entry.rate < median * 0.85) {
    findings.push(entry);
  }
}

console.log(`Checked ${measured.length} cue(s); median ${median.toFixed(2)} words/sec.`);
for (const entry of findings) {
  console.warn(
    `WARN ${entry.slug} ${entry.name}: ${entry.seconds.toFixed(2)}s at ${entry.rate.toFixed(2)} words/sec ` +
      `(${entry.segments} blocks of speech, ${entry.pausePoints} pause point(s) in the text). Listen for a repeated phrase.`,
  );
  console.warn(`     ${JSON.stringify(entry.text)}`);
}
if (findings.length === 0) console.log('Every cue matches the pace and shape of the words it was given.');

if (values.json) {
  console.log(
    `RESULT ${JSON.stringify({
      cues: measured.length,
      median: Number(median.toFixed(3)),
      findings: findings.map((entry) => ({slug: entry.slug, cue: entry.name, rate: Number(entry.rate.toFixed(3))})),
    })}`,
  );
}
