import timing from './timing.json';
import type {QuizQuestion} from '../types/content';

export const FPS = timing.fps;
export const SHORT_TIMING = timing.short;
export const EPISODE_TIMING = timing.episode;

export const getShortDurationInFrames = (clueSeconds = SHORT_TIMING.clue) =>
  (SHORT_TIMING.intro +
    clueSeconds * 2 +
    SHORT_TIMING.countdown +
    SHORT_TIMING.answer +
    SHORT_TIMING.fact +
    SHORT_TIMING.outro) *
  FPS;

export const getEpisodeQuestionSeconds = (question: QuizQuestion) =>
  question.readingTimeSeconds ?? EPISODE_TIMING.question;

export const getEpisodeAnswerSeconds = (question: QuizQuestion) =>
  question.answerTimeSeconds ?? EPISODE_TIMING.answer;

export const getEpisodeRoundSeconds = (question: QuizQuestion) =>
  getEpisodeQuestionSeconds(question) + EPISODE_TIMING.countdown + getEpisodeAnswerSeconds(question);

export const getEpisodeDurationInFrames = (
  questions: QuizQuestion[] | number,
  outroSeconds = EPISODE_TIMING.outro,
) => {
  const rounds =
    typeof questions === 'number'
      ? questions * (EPISODE_TIMING.question + EPISODE_TIMING.countdown + EPISODE_TIMING.answer)
      : questions.reduce((total, question) => total + getEpisodeRoundSeconds(question), 0);

  return (EPISODE_TIMING.intro + rounds + outroSeconds) * FPS;
};
