import {Composition} from 'remotion';
import {TriviaEpisode} from './compositions/TriviaEpisode';
import {TriviaShort} from './compositions/TriviaShort';
import {
  FPS,
  getEpisodeDurationInFrames,
  getShortDurationInFrames,
} from './config/timing';
import episodeData from '../content/human-body-digestion/content.json';
import shortData from '../content/human-body-stomach-short/content.json';
import type {Episode, TriviaShortData} from './types/content';

const shortProps = shortData as TriviaShortData;
const episodeProps = episodeData as Episode;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TriviaEpisode"
      component={TriviaEpisode}
      durationInFrames={getEpisodeDurationInFrames(
        episodeProps.questions,
        episodeProps.outroTimeSeconds,
      )}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={episodeProps}
      calculateMetadata={({props}) => ({
        durationInFrames: getEpisodeDurationInFrames(props.questions, props.outroTimeSeconds),
      })}
    />
    <Composition
      id="TriviaShort"
      component={TriviaShort}
      durationInFrames={getShortDurationInFrames(shortProps.clueTimeSeconds)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={shortProps}
      calculateMetadata={({props}) => ({
        durationInFrames: getShortDurationInFrames(props.clueTimeSeconds),
      })}
    />
  </>
);
