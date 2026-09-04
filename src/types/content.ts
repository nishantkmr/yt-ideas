export type Layout = 'short' | 'landscape';

export type Difficulty = 1 | 2 | 3 | 4;

export type QuestionType =
  | 'multiple-choice'
  | 'guess-picture'
  | 'who-am-i'
  | 'true-false';

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[];
  clues?: string[];
  answer: string;
  explanation: string;
  visual?: {
    type: 'picture' | 'silhouette';
    asset: string;
    alt: string;
  };
};

export type TriviaShortData = {
  id: string;
  type: 'guess-animal';
  answer: string;
  difficulty: Difficulty;
  clues: string[];
  funFact: string;
  visual: {
    type: 'silhouette';
    asset: string;
    alt: string;
  };
};

export type Episode = {
  id: string;
  title: string;
  category: string;
  theme: string;
  questions: QuizQuestion[];
};
