import {resolveVisual} from '../packs/component-registry';
import type {Layout, QuizVisual} from '../types/content';

type AnswerVisualProps = {
  visual: QuizVisual;
  layout: Layout;
};

/** The single place the answer stage asks which component draws a visual. */
export const AnswerVisual: React.FC<AnswerVisualProps> = ({visual, layout}) => {
  const {Answer} = resolveVisual(visual)!;
  return <Answer visual={visual} layout={layout} />;
};
