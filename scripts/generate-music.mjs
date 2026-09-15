import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {THEMES} from '../src/packs/manifest-registry.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'public', 'audio', 'music');
const sampleRate = 48000;
const seconds = 16;
const frameCount = sampleRate * seconds;

// Each theme's recipe is declared by the pack that owns the theme; this file
// only knows how to turn a recipe into audio. A new theme therefore needs no
// change here at all.
const themes = Object.fromEntries(THEMES.map((theme) => [theme.id, theme.music]));

const clamp = (value) => Math.max(-1, Math.min(1, value));

// A recipe that names a timbre or percussion this file does not implement used
// to render anyway -- the timbre fell through to a generic wave and the
// percussion simply went silent -- so a pack could ship a bed that sounded
// nothing like what it asked for, with no error anywhere. The workshop bed
// asked for `toy-synth` for months. Unknown names now fail at generation.
const TIMBRES = ['marimba', 'bell', 'droplet', 'pluck'];
const PERCUSSION = ['shaker', 'pulse', 'bubbles', 'frame-drum', 'woodblock', 'heartbeat'];

const checkRecipe = (name, config) => {
  const problems = [];
  if (!TIMBRES.includes(config.timbre)) {
    problems.push(`timbre "${config.timbre}" is not implemented (known: ${TIMBRES.join(', ')})`);
  }
  if (!PERCUSSION.includes(config.percussion)) {
    problems.push(
      `percussion "${config.percussion}" is not implemented (known: ${PERCUSSION.join(', ')})`,
    );
  }
  if (problems.length > 0) {
    throw new Error(`Theme "${name}" cannot be synthesised: ${problems.join('; ')}.`);
  }

  // The bed is looped end to end under the whole video, so it has to contain a
  // whole number of chord cycles or every repeat restarts mid-phrase. This is a
  // warning rather than an error because beds already rendered into published
  // videos have the fault and must not be silently re-cut.
  const beats = (seconds * config.bpm) / 60;
  const cycle = config.bass.length * 4;
  if (Math.abs(beats / cycle - Math.round(beats / cycle)) > 1e-9) {
    console.warn(
      `WARN ${name}: ${seconds}s at ${config.bpm}bpm is ${beats.toFixed(2)} beats, ` +
        `not a whole number of ${cycle}-beat chord cycles, so the loop seam falls mid-phrase. ` +
        `Tempos that divide evenly here: ${[60, 120, 180].join(', ')}.`,
    );
  }
};

const wave = (phase, timbre) => {
  const fundamental = Math.sin(phase);
  if (timbre === 'marimba') return fundamental * 0.72 + Math.sin(phase * 3) * 0.2 + Math.sin(phase * 5) * 0.08;
  if (timbre === 'bell') return fundamental * 0.62 + Math.sin(phase * 2.01) * 0.22 + Math.sin(phase * 3.98) * 0.16;
  if (timbre === 'droplet') return fundamental * 0.82 + Math.sin(phase * 2) * 0.18;
  return fundamental * 0.68 + Math.sin(phase * 2) * 0.22 + Math.sin(phase * 4) * 0.1;
};

const writeWav = async (name, config) => {
  checkRecipe(name, config);
  const samples = new Float64Array(frameCount * 2);
  const beatLength = 60 / config.bpm;
  let noiseState = 0x9e3779b9 ^ name.length;
  let peak = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const beat = time / beatLength;
    const eighth = beat * 2;
    const step = Math.floor(eighth) % config.notes.length;
    const stepPhase = eighth - Math.floor(eighth);
    const note = config.notes[step];
    const noteEnvelope = Math.min(1, stepPhase * 18) * Math.exp(-stepPhase * (config.timbre === 'bell' ? 2.8 : 5.2));
    const pitchDrift = config.timbre === 'droplet' ? 1 + 0.018 * Math.exp(-stepPhase * 8) : 1;
    const melody = wave(2 * Math.PI * note * pitchDrift * time, config.timbre) * noteEnvelope;

    // The pad is a bare sine that changes frequency every four beats. Without an
    // envelope it jumped mid-cycle at every chord change, which is a click four
    // times a bar -- the bed sounded broken at regular intervals. Fading each
    // chord in and out means the frequency only ever changes at silence.
    const chord = beat / 4;
    const chordPhase = chord - Math.floor(chord);
    const chordEnvelope = Math.min(1, chordPhase * 9) * Math.min(1, (1 - chordPhase) * 9);
    const bassNote = config.bass[Math.floor(chord) % config.bass.length];
    const pad = (
      Math.sin(2 * Math.PI * bassNote * time) +
      Math.sin(2 * Math.PI * bassNote * 1.5 * time) * 0.45
    ) * 0.14 * chordEnvelope;

    const beatPhase = beat - Math.floor(beat);
    noiseState = (1664525 * noiseState + 1013904223) >>> 0;
    const noise = noiseState / 0xffffffff * 2 - 1;
    let percussion = 0;
    if (config.percussion === 'shaker') percussion = noise * Math.exp(-stepPhase * 30) * 0.11;
    if (config.percussion === 'pulse') percussion = Math.sin(2 * Math.PI * 92 * time) * Math.exp(-beatPhase * 15) * 0.09;
    if (config.percussion === 'bubbles' && step % 3 === 0) percussion = Math.sin(2 * Math.PI * (700 + stepPhase * 500) * time) * Math.exp(-stepPhase * 20) * 0.08;
    if (config.percussion === 'frame-drum') percussion = (Math.sin(2 * Math.PI * 105 * time) + noise * 0.15) * Math.exp(-beatPhase * 24) * 0.13;
    if (config.percussion === 'woodblock') percussion = Math.sin(2 * Math.PI * 920 * time) * Math.exp(-stepPhase * 38) * 0.11;
    if (config.percussion === 'heartbeat') {
      const firstPulse = Math.sin(2 * Math.PI * 72 * time) * Math.exp(-beatPhase * 30);
      const secondPhase = Math.max(0, beatPhase - 0.18);
      const secondPulse = beatPhase >= 0.18
        ? Math.sin(2 * Math.PI * 86 * time) * Math.exp(-secondPhase * 42)
        : 0;
      percussion = (firstPulse + secondPulse * 0.72) * 0.075;
    }

    // Every percussion voice starts from full amplitude on its first sample, so
    // the waveform steps instead of rising: at a shaker's four hits a second
    // that is heard as a tick, not a shake. A few milliseconds of attack keeps
    // the rhythm and loses the edge.
    percussion *= Math.min(1, stepPhase * 46);

    const movement = Math.sin(2 * Math.PI * time / seconds);
    const edgeFade = Math.min(1, time / 0.05, (seconds - time) / 0.05);
    const left = (melody * (0.31 + movement * 0.025) + pad + percussion) * edgeFade;
    const right = (melody * (0.31 - movement * 0.025) + pad * 0.96 + percussion * 0.9) * edgeFade;
    samples[index * 2] = left;
    samples[index * 2 + 1] = right;
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
  }

  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = frameCount * channels * bytesPerSample;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  wav.writeUInt16LE(channels * bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);

  const gain = 0.76 / Math.max(peak, 0.001);
  for (let index = 0; index < samples.length; index += 1) {
    wav.writeInt16LE(Math.round(clamp(samples[index] * gain) * 32767), 44 + index * 2);
  }

  const output = join(outputRoot, `${name}.wav`);
  await writeFile(output, wav);
  console.log(`GENERATED ${output}`);
};

// Regenerating a bed that already exists is not free: prepare-content.mjs
// records its SHA-256 in every manifest, and Math.sin is implementation-defined
// in ECMAScript, so a future Node could silently change the music inside an
// already published video. Existing files are left alone unless --force says
// otherwise.
const {values} = parseArgs({
  options: {
    theme: {type: 'string', multiple: true, default: []},
    all: {type: 'boolean', default: false},
    force: {type: 'boolean', default: false},
    json: {type: 'boolean', default: false},
  },
  strict: true,
});

const requested = values.theme.length > 0 ? values.theme : Object.keys(themes);
const unknown = requested.filter((name) => !(name in themes));
if (unknown.length > 0) {
  console.error(
    `Unknown theme(s): ${unknown.join(', ')}. Known themes: ${Object.keys(themes).join(', ')}`,
  );
  process.exit(2);
}

await mkdir(outputRoot, {recursive: true});
const skipped = [];
const written = [];
for (const name of requested) {
  const output = join(outputRoot, `${name}.wav`);
  if (!values.force && (await access(output).then(() => true, () => false))) {
    console.log(`SKIP ${relative(projectRoot, output)} (exists)`);
    skipped.push(name);
    continue;
  }
  await writeWav(name, themes[name]);
  written.push(name);
}

if (values.json) {
  console.log(`RESULT ${JSON.stringify({requested, generated: written, skipped})}`);
}
