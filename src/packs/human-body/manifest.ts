import type {PackManifest} from '../contract.ts';
import {isText} from '../contract.ts';

// The human body family: the body-lab theme, the body-journey format and the
// code-native digestive diagram. Every rule below used to live in the shared
// validator, where one video's anatomy was part of the vocabulary every other
// video was checked against.

export const DIGESTIVE_ORGANS = [
  'mouth',
  'esophagus',
  'stomach',
  'liver',
  'gallbladder',
  'pancreas',
  'small-intestine',
  'large-intestine',
] as const;

export type DigestiveOrgan = (typeof DIGESTIVE_ORGANS)[number];

export type DigestiveDiagramVisual = {
  type: 'digestive-diagram';
  focus: DigestiveOrgan;
  alt: string;
  answerLabel?: string;
  answerHint?: string;
};

export const humanBodyPack = {
  id: 'human-body',
  title: 'Human Body',

  themes: [
    {
      id: 'body-lab',
      label: 'Body lab music bed',
      music: {
        bpm: 84,
        notes: [392, 493.88, 587.33, 523.25, 440, 523.25, 659.25, 587.33],
        bass: [98, 110, 82.41, 123.47],
        timbre: 'droplet',
        percussion: 'heartbeat',
      },
    },
  ],

  formats: [
    {
      id: 'body-journey',
      chrome: 'route-progress',
      copy: {
        challengeLabel: 'Inside-the-body mission',
        roundLabel: 'Journey stop',
        countdownPrompt: 'What happens here?',
        countdownAction: 'Choose the next discovery!',
        completionLabel: 'Body journey complete',
        orderedAnswerLabel: 'Correct route',
      },
      // A body journey is only a journey if every question is a stop on it and
      // every claim is traceable, so this format demands more than the base
      // schema does.
      validate: (content) => {
        const errors: string[] = [];
        const sourceIds = new Set<string>();

        content.researchSources?.forEach((source: any, index: number) => {
          if (!isText(source?.id)) {
            errors.push(`researchSources[${index}].id is required for body-journey episodes.`);
          } else if (sourceIds.has(source.id)) {
            errors.push(`researchSources[${index}].id is duplicated: ${source.id}`);
          } else {
            sourceIds.add(source.id);
          }
        });

        content.questions?.forEach((question: any, index: number) => {
          if (!isText(question?.journeyStop)) {
            errors.push(`questions[${index}].journeyStop is required for body-journey episodes.`);
          }
          if (!Array.isArray(question?.sourceRefs) || question.sourceRefs.length === 0) {
            errors.push(`questions[${index}].sourceRefs is required for body-journey episodes.`);
          } else {
            question.sourceRefs.forEach((sourceId: string) => {
              if (!sourceIds.has(sourceId)) {
                errors.push(
                  `questions[${index}].sourceRefs contains unknown source ID: ${sourceId}`,
                );
              }
            });
          }
        });

        return errors;
      },
    },
  ],

  visualTypes: [
    {
      id: 'digestive-diagram',
      // Drawn in code from the content, so there is no image file to license.
      requiresAsset: false,
      validate: (visual, label) => {
        const errors: string[] = [];
        if (!(DIGESTIVE_ORGANS as readonly string[]).includes(visual?.focus)) {
          errors.push(`${label}.visual.focus is not a supported digestive organ.`);
        }
        if (!isText(visual?.alt)) errors.push(`${label}.visual.alt is required.`);
        for (const field of ['answerLabel', 'answerHint'] as const) {
          if (visual?.[field] !== undefined && !isText(visual[field])) {
            errors.push(`${label}.visual.${field} must be non-empty when provided.`);
          }
        }
        return errors;
      },
    },
  ],

  questionTypes: [],
} as const satisfies PackManifest;
