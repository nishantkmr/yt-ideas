import timing from './timing.json';
import {
  episodeAnswerSeconds,
  episodeDurationInFrames,
  episodeQuestionSeconds,
  episodeRoundSeconds,
  shortDurationInFrames,
} from './durations.mjs';
import type {QuizQuestion} from '../types/content';

export const FPS = timing.fps;
export const SHORT_TIMING = timing.short;
export const EPISODE_TIMING = timing.episode;

export const getShortDurationInFrames = (clueSeconds = SHORT_TIMING.clue) =>
  shortDurationInFrames(timing, clueSeconds);

export const getEpisodeQuestionSeconds = (question: QuizQuestion) =>
  episodeQuestionSeconds(timing, question);

export const getEpisodeAnswerSeconds = (question: QuizQuestion) =>
  episodeAnswerSeconds(timing, question);

export const getEpisodeRoundSeconds = (question: QuizQuestion) =>
  episodeRoundSeconds(timing, question);

export const getEpisodeDurationInFrames = (
  questions: QuizQuestion[] | number,
  outroSeconds = EPISODE_TIMING.outro,
) => episodeDurationInFrames(timing, questions, outroSeconds);
