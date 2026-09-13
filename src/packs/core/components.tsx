import {GuessPicture} from '../../questions/GuessPicture';
import {ProgressBar} from '../../components/ProgressBar';
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
  chrome: {'progress-bar': ProgressBarChrome},
};
