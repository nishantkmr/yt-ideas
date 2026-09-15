import type {PackManifest} from '../contract.ts';
import {isText} from '../contract.ts';

// The everyday objects family: take one ordinary thing apart and look at every
// layer. It owns the `teardown` format and the code-native pencil cutaway, and
// borrows the core pack's workshop theme, so nothing outside this directory
// knows what a pencil is made of.

export const PENCIL_PARTS = [
  'inside',
  'point',
  'core',
  'slats',
  'wood',
  'barrel',
  'paint',
  'ferrule',
  'eraser',
  'layers',
  'line',
] as const;

export type PencilPart = (typeof PENCIL_PARTS)[number];

export type PencilDiagramVisual = {
  type: 'pencil-diagram';
  focus: PencilPart;
  alt: string;
  answerLabel?: string;
  answerHint?: string;
};

export const everydayObjectsPack = {
  id: 'everyday-objects',
  title: 'Everyday Objects',

  // No theme of its own: a teardown happens on a workbench, and the core pack
  // already owns the workshop bed.
  themes: [],

  formats: [
    {
      id: 'teardown',
      chrome: 'route-progress',
      copy: {
        challengeLabel: 'Teardown lab',
        roundLabel: 'Layer',
        countdownPrompt: "What's inside?",
        countdownAction: 'Lock in your guess!',
        completionLabel: 'Teardown complete',
      },
      // A teardown promises that every answer is a real property of a real
      // object, and several of the best pencil facts are folklore that no
      // source actually supports. So every question must name the layer it
      // opens and the source it came from.
      validate: (content) => {
        const errors: string[] = [];
        const sourceIds = new Set<string>();

        content.researchSources?.forEach((source: any, index: number) => {
          if (!isText(source?.id)) {
            errors.push(`researchSources[${index}].id is required for teardown episodes.`);
          } else if (sourceIds.has(source.id)) {
            errors.push(`researchSources[${index}].id is duplicated: ${source.id}`);
          } else {
            sourceIds.add(source.id);
          }
        });

        content.questions?.forEach((question: any, index: number) => {
          if (!isText(question?.journeyStop)) {
            errors.push(
              `questions[${index}].journeyStop is required for teardown episodes: name the layer.`,
            );
          }
          if (!Array.isArray(question?.sourceRefs) || question.sourceRefs.length === 0) {
            errors.push(`questions[${index}].sourceRefs is required for teardown episodes.`);
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
      id: 'pencil-diagram',
      // Drawn in code from the content, so there is no image file to license.
      requiresAsset: false,
      validate: (visual, label) => {
        const errors: string[] = [];
        if (!(PENCIL_PARTS as readonly string[]).includes(visual?.focus)) {
          errors.push(`${label}.visual.focus is not a part of a pencil.`);
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
