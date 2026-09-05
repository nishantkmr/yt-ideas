import {Composition} from 'remotion';
import {TriviaEpisode} from './compositions/TriviaEpisode';
import {TriviaShort} from './compositions/TriviaShort';
import {
  FPS,
  getEpisodeDurationInFrames,
  getShortDurationInFrames,
} from './config/timing';
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
      durationInFrames={getShortDurationInFrames()}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={shortProps}
      calculateMetadata={() => ({durationInFrames: getShortDurationInFrames()})}
    />
    <Composition
      id="TriviaEpisode"
      component={TriviaEpisode}
      durationInFrames={getEpisodeDurationInFrames(episodeProps.questions.length)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={episodeProps}
      calculateMetadata={({props}) => ({
        durationInFrames: getEpisodeDurationInFrames(props.questions.length),
      })}
    />
  </>
);
