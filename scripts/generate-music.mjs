import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'public', 'audio', 'music');
const sampleRate = 48000;
const seconds = 16;
const frameCount = sampleRate * seconds;

const themes = {
  jungle: {
    bpm: 120,
    notes: [293.66, 349.23, 392, 440, 523.25, 440, 392, 349.23],
    bass: [73.42, 98, 87.31, 110],
    timbre: 'marimba',
    percussion: 'shaker',
  },
  cosmic: {
    bpm: 90,
    notes: [261.63, 392, 466.16, 659.25, 587.33, 466.16, 392, 329.63],
    bass: [65.41, 77.78, 58.27, 87.31],
    timbre: 'bell',
    percussion: 'pulse',
  },
  ocean: {
    bpm: 75,
    notes: [349.23, 440, 523.25, 392, 440, 587.33, 523.25, 440],
    bass: [87.31, 65.41, 73.42, 98],
    timbre: 'droplet',
    percussion: 'bubbles',
  },
  atlas: {
    bpm: 105,
    notes: [392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 392],
    bass: [98, 123.47, 110, 146.83],
    timbre: 'pluck',
    percussion: 'frame-drum',
  },
  workshop: {
    bpm: 135,
    notes: [523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25],
    bass: [130.81, 164.81, 146.83, 196],
    timbre: 'toy-synth',
    percussion: 'woodblock',
  },
};

const clamp = (value) => Math.max(-1, Math.min(1, value));
const wave = (phase, timbre) => {
  const fundamental = Math.sin(phase);
  if (timbre === 'marimba') return fundamental * 0.72 + Math.sin(phase * 3) * 0.2 + Math.sin(phase * 5) * 0.08;
  if (timbre === 'bell') return fundamental * 0.62 + Math.sin(phase * 2.01) * 0.22 + Math.sin(phase * 3.98) * 0.16;
  if (timbre === 'droplet') return fundamental * 0.82 + Math.sin(phase * 2) * 0.18;
  if (timbre === 'pluck') return fundamental * 0.68 + Math.sin(phase * 2) * 0.22 + Math.sin(phase * 4) * 0.1;
  return fundamental * 0.7 + Math.sin(phase * 2) * 0.2 + Math.sin(phase * 3) * 0.1;
};

const writeWav = async (name, config) => {
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

    const bassNote = config.bass[Math.floor(beat / 4) % config.bass.length];
    const pad = (
      Math.sin(2 * Math.PI * bassNote * time) +
      Math.sin(2 * Math.PI * bassNote * 1.5 * time) * 0.45
    ) * 0.14;

    const beatPhase = beat - Math.floor(beat);
    noiseState = (1664525 * noiseState + 1013904223) >>> 0;
    const noise = noiseState / 0xffffffff * 2 - 1;
    let percussion = 0;
    if (config.percussion === 'shaker') percussion = noise * Math.exp(-stepPhase * 30) * 0.11;
    if (config.percussion === 'pulse') percussion = Math.sin(2 * Math.PI * 92 * time) * Math.exp(-beatPhase * 15) * 0.09;
    if (config.percussion === 'bubbles' && step % 3 === 0) percussion = Math.sin(2 * Math.PI * (700 + stepPhase * 500) * time) * Math.exp(-stepPhase * 20) * 0.08;
    if (config.percussion === 'frame-drum') percussion = (Math.sin(2 * Math.PI * 105 * time) + noise * 0.15) * Math.exp(-beatPhase * 24) * 0.13;
    if (config.percussion === 'woodblock') percussion = Math.sin(2 * Math.PI * 920 * time) * Math.exp(-stepPhase * 38) * 0.11;

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

await mkdir(outputRoot, {recursive: true});
for (const [name, config] of Object.entries(themes)) await writeWav(name, config);
