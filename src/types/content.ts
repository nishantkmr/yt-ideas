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

export type VisualTheme =
  | 'jungle'
  | 'cosmic'
  | 'ocean'
  | 'atlas'
  | 'workshop'
  | 'body-lab';

export type PresentationFormat =
  | 'classic'
  | 'expedition'
  | 'mystery'
  | 'lab'
  | 'world-tour'
  | 'body-journey';

export type CreativeProfile = {
  visualTheme: VisualTheme;
  presentationFormat: PresentationFormat;
  targetAge: string;
  hook: string;
  learningGoal: string;
  signatureMoment: string;
};

export type ResearchSource = {
  id?: string;
  title: string;
  url: string;
  accessedOn: string;
};

export type PronunciationNote = {
  term: string;
  sayAs: string;
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
  | 'true-false'
  | 'ordering';

export type DigestiveOrgan =
  | 'mouth'
  | 'esophagus'
  | 'stomach'
  | 'liver'
  | 'gallbladder'
  | 'pancreas'
  | 'small-intestine'
  | 'large-intestine';

export type QuizVisual =
  | {
      type: 'picture' | 'silhouette';
      asset: string;
      alt: string;
    }
  | {
      type: 'digestive-diagram';
      focus: DigestiveOrgan;
      alt: string;
      answerLabel?: string;
      answerHint?: string;
    };

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  readingTimeSeconds?: number;
  answerTimeSeconds?: number;
  question: string;
  options?: string[];
  clues?: string[];
  items?: string[];
  correctOrder?: string[];
  journeyStop?: string;
  sourceRefs?: string[];
  pronunciationNotes?: PronunciationNote[];
  answer: string;
  explanation: string;
  visual?: QuizVisual;
};

export type TriviaShortData = {
  id: string;
  type: 'guess-animal' | 'two-clue';
  title?: string;
  category?: string;
  answer: string;
  difficulty: Difficulty;
  clueTimeSeconds?: number;
  clues: string[];
  funFact: string;
  visual: QuizVisual;
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
  outroCallToAction?: string;
  outroTimeSeconds?: number;
};
