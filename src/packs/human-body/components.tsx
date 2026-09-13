import {RouteProgress} from '../../components/RouteProgress';
import {DigestiveDiagram} from './DigestiveDiagram';
import {defineVisual} from '../components.ts';
import type {PackComponents} from '../components.ts';
import type {DigestiveDiagramVisual} from './manifest.ts';

export const humanBodyComponents: PackComponents = {
  id: 'human-body',
  visuals: [
    defineVisual<DigestiveDiagramVisual>({
      id: 'digestive-diagram',
      // The diagram is wide, so it sits beside the choices rather than above.
      questionStageLayout: 'split',
      // Unlabelled during the question: the route is the puzzle, so naming the
      // organs would answer it.
      Question: () => (
        <DigestiveDiagram
          alt="Unlabelled digestive-system route for the question"
          revealed={false}
        />
      ),
      Answer: ({visual}) => (
        <DigestiveDiagram
          alt={visual.alt}
          answerHint={visual.answerHint}
          answerLabel={visual.answerLabel}
          focus={visual.focus}
          revealed
        />
      ),
    }),
  ],
  // Registered by name so the body-journey format can select it without the
  // compositions naming this pack.
  chrome: {'route-progress': RouteProgress},
};
