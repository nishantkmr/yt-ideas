import {Composition, Folder} from 'remotion';
import {TriviaEpisode} from './compositions/TriviaEpisode';
import {TriviaShort} from './compositions/TriviaShort';
import {
  FPS,
  getEpisodeDurationInFrames,
  getShortDurationInFrames,
} from './config/timing';
import animalsEpisodeData from '../content/animals-ultimate-challenge/content.json';
import digestionEpisodeData from '../content/human-body-digestion/content.json';
import pencilEpisodeData from '../content/everyday-objects-pencil/content.json';
import zebraShortData from '../content/animals-zebra-short/content.json';
import stomachShortData from '../content/human-body-stomach-short/content.json';
import graphiteShortData from '../content/everyday-objects-graphite-short/content.json';
import type {Episode, TriviaShortData} from './types/content';

// Every bundle gets its own composition so Studio lists the whole catalog and
// designing a new video needs no edit here beyond adding it to one of these two
// arrays. Registering a video is the same two-line cost as registering a pack.
const episodes: {slug: string; data: Episode}[] = [
  {slug: 'animals-ultimate-challenge', data: animalsEpisodeData as Episode},
  {slug: 'human-body-digestion', data: digestionEpisodeData as Episode},
  {slug: 'everyday-objects-pencil', data: pencilEpisodeData as Episode},
];

const shorts: {slug: string; data: TriviaShortData}[] = [
  {slug: 'animals-zebra-short', data: zebraShortData as TriviaShortData},
  {slug: 'human-body-stomach-short', data: stomachShortData as TriviaShortData},
  {slug: 'everyday-objects-graphite-short', data: graphiteShortData as TriviaShortData},
];

// The pipeline renders through these two ids and always supplies --props, so
// their defaults only decide what Studio shows when one is opened directly.
// They cannot be renamed or removed without changing render-content.mjs and
// render-still.mjs, which pick the composition from the content's kind. Named
// rather than taken from the arrays above, so adding a video cannot silently
// change what either one opens with.
const pipelineEpisode = digestionEpisodeData as Episode;
const pipelineShort = stomachShortData as TriviaShortData;

const episodeDuration = (data: Episode) =>
  getEpisodeDurationInFrames(data.questions, data.outroTimeSeconds);

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Videos">
      {episodes.map(({slug, data}) => (
        <Composition
          key={slug}
          id={slug}
          component={TriviaEpisode}
          durationInFrames={episodeDuration(data)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={data}
          calculateMetadata={({props}) => ({durationInFrames: episodeDuration(props)})}
        />
      ))}
      {shorts.map(({slug, data}) => (
        <Composition
          key={slug}
          id={slug}
          component={TriviaShort}
          durationInFrames={getShortDurationInFrames(data.clueTimeSeconds)}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={data}
          calculateMetadata={({props}) => ({
            durationInFrames: getShortDurationInFrames(props.clueTimeSeconds),
          })}
        />
      ))}
    </Folder>
    <Folder name="Pipeline">
      <Composition
        id="TriviaEpisode"
        component={TriviaEpisode}
        durationInFrames={episodeDuration(pipelineEpisode)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={pipelineEpisode}
        calculateMetadata={({props}) => ({durationInFrames: episodeDuration(props)})}
      />
      <Composition
        id="TriviaShort"
        component={TriviaShort}
        durationInFrames={getShortDurationInFrames(pipelineShort.clueTimeSeconds)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={pipelineShort}
        calculateMetadata={({props}) => ({
          durationInFrames: getShortDurationInFrames(props.clueTimeSeconds),
        })}
      />
    </Folder>
  </>
);
