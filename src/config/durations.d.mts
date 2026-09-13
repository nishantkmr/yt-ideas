import type {QuizQuestion} from '../types/content';

export type Timing = {
  fps: number;
  short: {intro: number; clue: number; countdown: number; answer: number; fact: number; outro: number};
  episode: {intro: number; question: number; countdown: number; answer: number; outro: number};
};

export function shortDurationInFrames(timing: Timing, clueSeconds?: number): number;
export function episodeQuestionSeconds(timing: Timing, question: QuizQuestion): number;
export function episodeAnswerSeconds(timing: Timing, question: QuizQuestion): number;
export function episodeRoundSeconds(timing: Timing, question: QuizQuestion): number;
export function episodeDurationInFrames(
  timing: Timing,
  questions: QuizQuestion[] | number,
  outroSeconds?: number,
): number;
