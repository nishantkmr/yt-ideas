import './theme.css';
import {GuessPicture} from '../../questions/GuessPicture';
import {ProgressBar} from '../../components/ProgressBar';
import {RouteProgress} from '../../components/RouteProgress';
import {defineVisual} from '../components.ts';
import type {ChromeProps, PackComponents} from '../components.ts';
import type {PictureVisual} from '../../types/content';

// The plain progress bar ignores the journey stops that route-style chrome
// uses, so it is adapted rather than widened.
const ProgressBarChrome: React.FC<ChromeProps> = ({current, total}) => (
  <ProgressBar current={current} total={total} />
);

const pictureVisual = defineVisual<PictureVisual>({
  id: 'picture',
  // Deliberately no Question component: a picture of the answer during the
  // question would give it away.
  Answer: ({visual}) => <GuessPicture alt={visual.alt} asset={visual.asset} />,
});

export const coreComponents: PackComponents = {
  id: 'core',
  visuals: [
    pictureVisual,
    {...pictureVisual, id: 'silhouette'},
  ],
  // Both chrome styles are shared brand furniture: the human body journey and
  // the everyday-objects teardown are different families that walk the same
  // kind of route, so the route indicator cannot belong to either one.
  chrome: {'progress-bar': ProgressBarChrome, 'route-progress': RouteProgress},
};
