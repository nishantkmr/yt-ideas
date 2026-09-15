import type {PackManifest} from '../contract.ts';

// The shared brand: themes, formats, question types and picture visuals that
// belong to WonderOwl Quiz rather than to any one video family.

export const corePack = {
  id: 'core',
  title: 'WonderOwl Quiz',

  themes: [
    {
      id: 'jungle',
      label: 'Jungle music bed',
      music: {
        bpm: 120,
        notes: [293.66, 349.23, 392, 440, 523.25, 440, 392, 349.23],
        bass: [73.42, 98, 87.31, 110],
        timbre: 'marimba',
        percussion: 'shaker',
      },
    },
    {
      id: 'cosmic',
      label: 'Cosmic music bed',
      music: {
        bpm: 90,
        notes: [261.63, 392, 466.16, 659.25, 587.33, 466.16, 392, 329.63],
        bass: [65.41, 77.78, 58.27, 87.31],
        timbre: 'bell',
        percussion: 'pulse',
      },
    },
    {
      id: 'ocean',
      label: 'Ocean music bed',
      music: {
        bpm: 75,
        notes: [349.23, 440, 523.25, 392, 440, 587.33, 523.25, 440],
        bass: [87.31, 65.41, 73.42, 98],
        timbre: 'droplet',
        percussion: 'bubbles',
      },
    },
    {
      id: 'atlas',
      label: 'Atlas music bed',
      music: {
        bpm: 105,
        notes: [392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 392],
        bass: [98, 123.47, 110, 146.83],
        timbre: 'pluck',
        percussion: 'frame-drum',
      },
    },
    {
      id: 'workshop',
      label: 'Workshop music bed',
      // A quiz bed for children, not a workshop sound effect. The first version
      // ran eighth notes at 135bpm under a 920Hz woodblock on every one of
      // them, and asked for a `toy-synth` timbre the synthesiser has never
      // implemented, so it fell back to a generic wave: bright, shrill and
      // relentless. This is slower, warmer, and pentatonic against a I-vi-IV-V
      // bass, so no melody note can clash with the pad underneath it.
      music: {
        bpm: 104,
        notes: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440],
        bass: [130.81, 110, 174.61, 196],
        timbre: 'marimba',
        percussion: 'shaker',
      },
    },
  ],

  formats: [
    {
      id: 'classic',
      copy: {
        challengeLabel: 'Quiz challenge',
        roundLabel: 'Question',
        countdownPrompt: 'Final answer?',
        countdownAction: 'Make your choice!',
        completionLabel: 'Challenge complete',
      },
    },
    {
      id: 'expedition',
      copy: {
        challengeLabel: 'Explorer expedition',
        roundLabel: 'Trail',
        countdownPrompt: 'Choose your path',
        countdownAction: 'Lock in your discovery!',
        completionLabel: 'Expedition complete',
      },
    },
    {
      id: 'mystery',
      copy: {
        challengeLabel: 'Mystery mission',
        roundLabel: 'Case file',
        countdownPrompt: 'Have a theory?',
        countdownAction: 'Solve the mystery!',
        completionLabel: 'Case closed',
      },
    },
    {
      id: 'lab',
      copy: {
        challengeLabel: 'Discovery lab',
        roundLabel: 'Experiment',
        countdownPrompt: 'Test your theory',
        countdownAction: 'Record your answer!',
        completionLabel: 'Discovery logged',
      },
    },
    {
      id: 'world-tour',
      copy: {
        challengeLabel: 'World tour',
        roundLabel: 'Tour stop',
        countdownPrompt: 'Ready to explore?',
        countdownAction: 'Stamp your answer!',
        completionLabel: 'Journey complete',
      },
    },
  ],

  visualTypes: [
    {id: 'picture', requiresAsset: true},
    {id: 'silhouette', requiresAsset: true},
  ],

  questionTypes: [
    {id: 'multiple-choice'},
    {id: 'guess-picture'},
    {id: 'who-am-i'},
    {id: 'true-false'},
    {id: 'ordering'},
  ],
} as const satisfies PackManifest;
