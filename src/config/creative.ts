import type {PresentationFormat} from '../types/content';

type PresentationCopy = {
  challengeLabel: string;
  roundLabel: string;
  countdownPrompt: string;
  countdownAction: string;
  completionLabel: string;
};

export const PRESENTATION_COPY: Record<PresentationFormat, PresentationCopy> = {
  classic: {
    challengeLabel: 'Quiz challenge',
    roundLabel: 'Question',
    countdownPrompt: 'Final answer?',
    countdownAction: 'Make your choice!',
    completionLabel: 'Challenge complete',
  },
  expedition: {
    challengeLabel: 'Explorer expedition',
    roundLabel: 'Trail',
    countdownPrompt: 'Choose your path',
    countdownAction: 'Lock in your discovery!',
    completionLabel: 'Expedition complete',
  },
  mystery: {
    challengeLabel: 'Mystery mission',
    roundLabel: 'Case file',
    countdownPrompt: 'Have a theory?',
    countdownAction: 'Solve the mystery!',
    completionLabel: 'Case closed',
  },
  lab: {
    challengeLabel: 'Discovery lab',
    roundLabel: 'Experiment',
    countdownPrompt: 'Test your theory',
    countdownAction: 'Record your answer!',
    completionLabel: 'Discovery logged',
  },
  'world-tour': {
    challengeLabel: 'World tour',
    roundLabel: 'Tour stop',
    countdownPrompt: 'Ready to explore?',
    countdownAction: 'Stamp your answer!',
    completionLabel: 'Journey complete',
  },
};
