import type {QuizVisual} from '../types/content';

// Component-side half of the pack contract. Kept apart from contract.ts because
// that file is also read by the build scripts through Node's type stripping,
// and this one refers to React.
//
// Naming rule: never give a pack's manifest and components the same basename.
// Webpack resolves .ts before .tsx, so an index.ts would silently shadow an
// index.tsx and the components would simply never render, with no error.

export type VisualSlotProps<V extends QuizVisual = QuizVisual> = {
  visual: V;
  layout: 'landscape' | 'short';
};

export type VisualModule<V extends QuizVisual = QuizVisual> = {
  id: string;
  /** Shown during the question. Omitted when a visual would give the answer away. */
  Question?: React.FC<VisualSlotProps<V>>;
  /** Shown during the answer reveal. */
  Answer: React.FC<VisualSlotProps<V>>;
  /** 'split' puts the visual beside the choices instead of above them. */
  questionStageLayout?: 'inline' | 'split';
};

export type ChromeProps = {
  current: number;
  total: number;
  stops: string[];
};

export type PackComponents = {
  id: string;
  visuals: readonly VisualModule[];
  /** Progress indicators a format can select by name. */
  chrome?: Record<string, React.FC<ChromeProps>>;
};

/**
 * Registers a visual whose components expect a narrowed visual type. The
 * registry dispatches on `visual.type`, so by the time a module runs its visual
 * is already the variant it declared.
 */
export const defineVisual = <V extends QuizVisual>(module: VisualModule<V>): VisualModule =>
  module as unknown as VisualModule;
