// What a content pack may contribute to the studio.
//
// A pack is one video family: the human body pack owns the body-lab theme, the
// body-journey format, the digestive diagram and the rules that go with them.
// Before packs existed, adding a family meant editing four enum lists, a music
// table, a copy table and three dispatch branches spread across the codebase.
//
// This file declares types only. The manifests that implement it import nothing
// at all, which is what lets the same file be read by Node's type stripping in
// the build scripts and compiled into the Remotion bundle. Two rules keep that
// working:
//
//   1. Pack validators are pure and synchronous. Everything touching the file
//      system -- existence, hashes, audio duration -- stays in the build scripts
//      and is driven by the declarative flags below.
//   2. Only erasable TypeScript. No enum, no namespace, no decorators.

export type PresentationCopy = {
  challengeLabel: string;
  roundLabel: string;
  countdownPrompt: string;
  countdownAction: string;
  completionLabel: string;
};

/** Inputs to the procedural synthesiser in scripts/generate-music.mjs. */
export type MusicRecipe = {
  bpm: number;
  notes: number[];
  bass: number[];
  timbre: string;
  percussion: string;
};

export type ThemeManifest = {
  id: string;
  /** Used as the audio track's accessible name in the render. */
  label: string;
  music: MusicRecipe;
};

export type FormatManifest = {
  id: string;
  copy: PresentationCopy;
  /**
   * Which registered chrome component draws progress for this format.
   * Defaults to the plain progress bar.
   */
  chrome?: string;
  /** Extra rules this format imposes on a whole content file. */
  validate?: (content: any) => string[];
};

export type VisualTypeManifest = {
  id: string;
  /**
   * Whether `visual.asset` names a file. Code-native visuals such as the
   * digestive diagram draw themselves and have no asset to license or hash.
   */
  requiresAsset: boolean;
  validate?: (visual: any, label: string) => string[];
};

export type QuestionTypeManifest = {
  id: string;
  validate?: (question: any, label: string) => string[];
};

export type PackManifest = {
  id: string;
  title: string;
  themes: readonly ThemeManifest[];
  formats: readonly FormatManifest[];
  visualTypes: readonly VisualTypeManifest[];
  questionTypes: readonly QuestionTypeManifest[];
};

export const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
