import {coreComponents} from './core/components';
import {humanBodyComponents} from './human-body/components';
import {findFormat} from './manifest-registry.ts';
import type {ChromeProps, PackComponents, VisualModule} from './components.ts';
import type {PresentationFormat, QuizVisual} from '../types/content';

// Resolves the components a content file asks for. The compositions ask here
// instead of testing `visual.type === '...'` themselves, which is what stopped
// the same dispatch from being written out three times and let the topic
// specific components leave src/components/ entirely.
const PACK_COMPONENTS: readonly PackComponents[] = [coreComponents, humanBodyComponents];

const VISUALS = new Map<string, VisualModule>(
  PACK_COMPONENTS.flatMap((pack) => pack.visuals.map((visual) => [visual.id, visual] as const)),
);

const CHROME = new Map<string, React.FC<ChromeProps>>(
  PACK_COMPONENTS.flatMap((pack) => Object.entries(pack.chrome ?? {})),
);

export const resolveVisual = (visual: QuizVisual | undefined): VisualModule | undefined => {
  if (!visual) return undefined;
  const module = VISUALS.get(visual.type);
  if (!module) {
    // Throwing is deliberate. Remotion surfaces a render-time exception loudly,
    // whereas rendering nothing would produce a finished-looking video with a
    // silently missing visual.
    throw new Error(
      `No pack registers the visual type "${visual.type}". Registered types: ` +
        `${[...VISUALS.keys()].join(', ')}.`,
    );
  }
  return module;
};

export const resolveChrome = (format: PresentationFormat): React.FC<ChromeProps> => {
  const name = findFormat(format)?.chrome ?? 'progress-bar';
  const chrome = CHROME.get(name);
  if (!chrome) {
    throw new Error(
      `Format "${format}" asks for chrome "${name}", which no pack registers. ` +
        `Registered chrome: ${[...CHROME.keys()].join(', ')}.`,
    );
  }
  return chrome;
};
