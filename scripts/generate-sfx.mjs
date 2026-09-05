import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(projectRoot, 'public', 'audio', 'sfx', 'countdown-tick.wav');
const sampleRate = 48000;
const duration = 0.12;
const sampleCount = Math.floor(sampleRate * duration);
const dataSize = sampleCount * 2;
const wav = Buffer.alloc(44 + dataSize);

wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);

let noiseState = 0x12345678;
for (let index = 0; index < sampleCount; index += 1) {
  const time = index / sampleRate;
  const envelope = Math.exp(-time * 42);
  noiseState = (1664525 * noiseState + 1013904223) >>> 0;
  const noise = (noiseState / 0xffffffff) * 2 - 1;
  const tone = Math.sin(2 * Math.PI * 1150 * time) * 0.72;
  const overtone = Math.sin(2 * Math.PI * 1850 * time) * 0.18;
  const sample = (tone + overtone + noise * 0.1) * envelope;
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 24000), 44 + index * 2);
}

await mkdir(dirname(output), {recursive: true});
await writeFile(output, wav);
console.log(`GENERATED ${output}`);
