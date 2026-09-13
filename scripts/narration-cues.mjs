import {join} from 'node:path';
import {
  narrationCueNames,
  projectRoot,
  relativeToProject,
  resolveMediaSource,
  sha256,
} from './content-tools.mjs';

// Narration wording used to live inside the Python synthesiser, which meant the
// script for every video was hard-coded next to the HTTP client and branched on
// one video's subject matter. It lives here instead, so Python became a plain
// text-to-speech renderer driven by the cue sheet this module produces.
//
// The wording below is a character-exact port of what the Python generated.
// The synthesiser fingerprints each cue by its text, so any drift here -- even a
// changed space -- invalidates the cache and re-spends API credits on narration
// that was already approved. Treat these strings as the audio they produced.

const coreEpisodeCues = (content) => {
  const cues = {
    intro: `Hello, curious explorers! Welcome to ${content.title}. Let's play!`,
    outro:
      `Amazing work! You completed all ${content.questions.length} questions. ` +
      (content.outroCallToAction
        ? `${content.outroCallToAction} Keep exploring!`
        : 'Thanks for playing, and keep exploring!'),
  };

  content.questions.forEach((question, index) => {
    cues[`${question.id}-question`] = `Question ${index + 1}. ${question.question}`;
    const answerLead =
      question.type === 'ordering'
        ? `The correct order is ${question.answer}.`
        : `It's ${question.answer}!`;
    cues[`${question.id}-answer`] = `${answerLead} ${question.explanation}`;
  });

  return cues;
};

const coreShortCues = (content) => {
  const isAnimal = content.type === 'guess-animal';
  return {
    intro: isAnimal
      ? 'Hello, superstar! Can you guess the animal?'
      : `Hello, superstar! ${content.title ?? 'Can you solve the clues?'}`,
    'clue-1': `Here's clue one. ${content.clues[0]}`,
    'clue-2': `And clue two. ${content.clues[1]}`,
    answer: isAnimal
      ? `Yes! It's a ${content.answer}. Great guessing!`
      : `The answer is ${content.answer}. Great thinking!`,
    fact: `Here's a fun fact. ${content.funFact}`,
    outro: 'Amazing job, superstar! Thanks for playing. See you next time!',
  };
};

export const buildCues = (content, kind) =>
  kind === 'episode' ? coreEpisodeCues(content) : coreShortCues(content);

export const buildCueSheet = (content, kind) => {
  const narration = content.narration;
  if (!narration) throw new Error(`${content.id} has no narration configuration.`);

  const cues = {...buildCues(content, kind), ...(narration.script ?? {})};

  // The cue set is a contract: it names the files <Voiceover> asks for, the
  // files the validator checks against each scene's budget, and the files the
  // synthesiser considers current. A cue that is renamed here but not there
  // would leave approved audio orphaned, so a mismatch fails loudly now rather
  // than quietly deleting narration later.
  const expected = narrationCueNames(content, kind);
  const actual = Object.keys(cues);
  const missing = expected.filter((cue) => !actual.includes(cue));
  const unexpected = actual.filter((cue) => !expected.includes(cue));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${content.id} cue set does not match its scenes. ` +
        `Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
    );
  }

  const empty = expected.filter((cue) => typeof cues[cue] !== 'string' || cues[cue].trim() === '');
  if (empty.length > 0) {
    throw new Error(`${content.id} has empty narration text for: ${empty.join(', ')}.`);
  }

  return {
    schemaVersion: 1,
    contentId: content.id,
    kind,
    provider: narration.provider,
    voice: narration.voice,
    format: narration.format,
    // How the render addresses the cues, relative to public/.
    audioBase: narration.audioBase,
    // Where they are written and version-controlled. For a bundle this is
    // inside content/<slug>/media/, never the generated public/ mirror, so the
    // synthesiser cannot fill a mirror that a later sync would wipe.
    audioRoot: relativeToProject(resolveMediaSource(narration.audioBase)),
    cues: expected.map((name) => ({name, text: cues[name]})),
  };
};

export const cueSheetPath = (sheet) =>
  join(
    projectRoot,
    'work',
    'voiceover',
    `${sheet.contentId}-${sha256(JSON.stringify(sheet)).slice(0, 12)}.json`,
  );
