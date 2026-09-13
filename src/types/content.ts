import type {
  PresentationFormat,
  QuestionType,
  QuizVisual,
  VisualTheme,
} from '../packs/manifest-registry';

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

// Derived from the pack manifests so the vocabulary has exactly one definition.
// See src/packs/manifest-registry.ts.
export type {
  VisualTheme,
  PresentationFormat,
  QuestionType,
} from '../packs/manifest-registry';

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
  /**
   * Overrides the narration text for individual cues. Keys must be cue names
   * for this content's scenes (`intro`, `<questionId>-answer`, ...). Changing a
   * cue's text invalidates its cached audio and re-synthesises it.
   */
  script?: Record<string, string>;
};

export type {PictureVisual, QuizVisual} from '../packs/manifest-registry';

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
