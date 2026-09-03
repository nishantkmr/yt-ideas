import {Composition} from 'remotion';
import {TriviaEpisode} from './compositions/TriviaEpisode';
import {TriviaShort} from './compositions/TriviaShort';
import episodeData from './data/animal-episode.json';
import shortData from './data/zebra-short.json';
import type {Episode, TriviaShortData} from './types/content';

const shortProps = shortData as TriviaShortData;
const episodeProps = episodeData as Episode;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TriviaShort"
      component={TriviaShort}
      durationInFrames={24 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={shortProps}
    />
    <Composition
      id="TriviaEpisode"
      component={TriviaEpisode}
      durationInFrames={125 * 30}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={episodeProps}
    />
  </>
);
