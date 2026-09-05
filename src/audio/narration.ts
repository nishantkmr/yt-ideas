import type {NarrationConfig} from '../types/content';

const cueAsset = (narration: NarrationConfig | undefined, cue: string) =>
  narration?.enabled ? `${narration.audioBase}/${cue}.${narration.format}` : undefined;

export const shortNarrationAsset = (
  narration: NarrationConfig | undefined,
  cue: 'intro' | 'clue-1' | 'clue-2' | 'answer' | 'fact' | 'outro',
) => cueAsset(narration, cue);

export const episodeNarrationAsset = (
  narration: NarrationConfig | undefined,
  cue: 'intro' | 'outro' | `${string}-question` | `${string}-answer`,
) => cueAsset(narration, cue);
