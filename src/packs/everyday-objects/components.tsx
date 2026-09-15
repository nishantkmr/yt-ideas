import './theme.css';
import {PencilDiagram} from './PencilDiagram';
import {defineVisual} from '../components.ts';
import type {PackComponents} from '../components.ts';
import type {PencilDiagramVisual} from './manifest.ts';

export const everydayObjectsComponents: PackComponents = {
  id: 'everyday-objects',
  visuals: [
    defineVisual<PencilDiagramVisual>({
      id: 'pencil-diagram',
      // The pencil is tall, so it sits beside the choices rather than above.
      questionStageLayout: 'split',
      // Nothing is named while the question is on screen: a labelled cutaway
      // would answer every question in the episode at once.
      Question: () => (
        <PencilDiagram alt="Unlabelled pencil waiting to be taken apart" revealed={false} />
      ),
      Answer: ({visual}) => (
        <PencilDiagram
          alt={visual.alt}
          answerHint={visual.answerHint}
          answerLabel={visual.answerLabel}
          focus={visual.focus}
          revealed
        />
      ),
    }),
  ],
};
