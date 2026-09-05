export type Layout = 'short' | 'landscape';

export type Difficulty = 1 | 2 | 3 | 4;

export type ContentReview = {
  status: 'draft' | 'approved';
  reviewedBy?: string;
  reviewedAt?: string;
  factsChecked?: boolean;
  rightsChecked?: boolean;
  editorialChecked?: boolean;
};

export type VisualTheme = 'jungle' | 'cosmic' | 'ocean' | 'atlas' | 'workshop';

export type PresentationFormat =
  | 'classic'
  | 'expedition'
  | 'mystery'
  | 'lab'
  | 'world-tour';

export type CreativeProfile = {
  visualTheme: VisualTheme;
  presentationFormat: PresentationFormat;
  targetAge: string;
  hook: string;
  learningGoal: string;
  signatureMoment: string;
};

export type ResearchSource = {
  title: string;
  url: string;
  accessedOn: string;
};

export type NarrationConfig = {
  enabled: boolean;
  provider:
    | 'edge-neural'
    | 'windows-sapi'
    | 'kokoro-local'
    | 'sarvam-bulbul-v3';
  voice: string;
  audioBase: string;
  format: 'mp3' | 'wav';
};

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
  type: 'guess-animal' | 'two-clue';
  title?: string;
  category?: string;
  answer: string;
  difficulty: Difficulty;
  clues: string[];
  funFact: string;
  visual: {
    type: 'silhouette';
    asset: string;
    alt: string;
  };
  review: ContentReview;
  creative: CreativeProfile;
  researchSources: ResearchSource[];
  narration?: NarrationConfig;
};

export type Episode = {
  id: string;
  title: string;
  category: string;
  theme: string;
  creative: CreativeProfile;
  researchSources: ResearchSource[];
  questions: QuizQuestion[];
  review: ContentReview;
  narration?: NarrationConfig;
};
