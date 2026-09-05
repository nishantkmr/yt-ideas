import timing from './timing.json';

export const FPS = timing.fps;
export const SHORT_TIMING = timing.short;
export const EPISODE_TIMING = timing.episode;

export const getShortDurationInFrames = () =>
  (SHORT_TIMING.intro +
    SHORT_TIMING.clue * 2 +
    SHORT_TIMING.countdown +
    SHORT_TIMING.answer +
    SHORT_TIMING.fact +
    SHORT_TIMING.outro) *
  FPS;

export const getEpisodeDurationInFrames = (questionCount: number) =>
  (EPISODE_TIMING.intro +
    questionCount *
      (EPISODE_TIMING.question + EPISODE_TIMING.countdown + EPISODE_TIMING.answer) +
    EPISODE_TIMING.outro) *
  FPS;
