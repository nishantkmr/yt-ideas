import {corePack} from './core/manifest.ts';
import {humanBodyPack} from './human-body/manifest.ts';
import type {
  FormatManifest,
  PackManifest,
  PresentationCopy,
  QuestionTypeManifest,
  ThemeManifest,
  VisualTypeManifest,
} from './contract.ts';

// The one list of packs. Registering a pack here is what makes its themes,
// formats, visual types and rules exist -- for the validator, the music
// synthesiser and the compositions alike. Adding a video family is this line
// plus its own directory.
// Annotated as the general type so the aggregate lists below widen to the
// contract rather than to the literal shape of whichever pack comes first.
export const PACKS: readonly PackManifest[] = [corePack, humanBodyPack];

export const THEMES: readonly ThemeManifest[] = PACKS.flatMap((pack) => pack.themes);
export const FORMATS: readonly FormatManifest[] = PACKS.flatMap((pack) => pack.formats);
export const VISUAL_TYPES: readonly VisualTypeManifest[] = PACKS.flatMap(
  (pack) => pack.visualTypes,
);
export const QUESTION_TYPES: readonly QuestionTypeManifest[] = PACKS.flatMap(
  (pack) => pack.questionTypes,
);

export const THEME_IDS = THEMES.map((theme) => theme.id);
export const FORMAT_IDS = FORMATS.map((format) => format.id);
export const VISUAL_TYPE_IDS = VISUAL_TYPES.map((visual) => visual.id);
export const QUESTION_TYPE_IDS = QUESTION_TYPES.map((question) => question.id);

export const findTheme = (id: string) => THEMES.find((theme) => theme.id === id);
export const findFormat = (id: string) => FORMATS.find((format) => format.id === id);
export const findVisualType = (id: string) => VISUAL_TYPES.find((visual) => visual.id === id);

/** Which pack owns a presentation format, used to scope that pack's styling. */
export const packOwning = (formatId: string): string =>
  PACKS.find((pack) => pack.formats.some((format) => format.id === formatId))?.id ?? 'core';

// The vocabulary types are derived from the manifests rather than declared
// beside them, so a theme cannot exist in TypeScript without also existing for
// the validator and the music synthesiser.
export type VisualTheme =
  | (typeof corePack.themes)[number]['id']
  | (typeof humanBodyPack.themes)[number]['id'];

export type PresentationFormat =
  | (typeof corePack.formats)[number]['id']
  | (typeof humanBodyPack.formats)[number]['id'];

export type QuestionType = (typeof corePack.questionTypes)[number]['id'];

export const getPresentationCopy = (format: PresentationFormat): PresentationCopy =>
  findFormat(format)!.copy;

export const musicAssetFor = (theme: VisualTheme) => {
  const entry = findTheme(theme);
  return {asset: `audio/music/${theme}.wav`, name: entry?.label ?? `${theme} music bed`};
};
