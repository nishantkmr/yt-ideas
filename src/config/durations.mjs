// Scene duration maths shared by the Remotion compositions and the build
// scripts. Every function takes the parsed timing.json as its first argument so
// this module needs no imports at all: `src/config/timing.ts` binds the JSON for
// the render side, while the .mjs tooling passes the copy it already parsed.
// Keeping one implementation here is what stops a manifest from recording a
// duration that disagrees with the video it describes.

export const shortDurationInFrames = (timing, clueSeconds = timing.short.clue) =>
  (timing.short.intro +
    clueSeconds * 2 +
    timing.short.countdown +
    timing.short.answer +
    timing.short.fact +
    timing.short.outro) *
  timing.fps;

export const episodeQuestionSeconds = (timing, question) =>
  question.readingTimeSeconds ?? timing.episode.question;

export const episodeAnswerSeconds = (timing, question) =>
  question.answerTimeSeconds ?? timing.episode.answer;

export const episodeRoundSeconds = (timing, question) =>
  episodeQuestionSeconds(timing, question) +
  timing.episode.countdown +
  episodeAnswerSeconds(timing, question);

export const episodeDurationInFrames = (
  timing,
  questions,
  outroSeconds = timing.episode.outro,
) => {
  const rounds =
    typeof questions === 'number'
      ? questions *
        (timing.episode.question + timing.episode.countdown + timing.episode.answer)
      : questions.reduce((total, question) => total + episodeRoundSeconds(timing, question), 0);

  return (timing.episode.intro + rounds + outroSeconds) * timing.fps;
};
