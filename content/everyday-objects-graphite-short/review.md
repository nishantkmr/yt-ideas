# Pencil Mystery Short — Review

Content file: `content/everyday-objects-graphite-short/content.json`

## Review checklist

- [ ] The graphite facts match the cited McGill OSS source.
- [ ] The reveal uses the original code-drawn pencil cutaway and needs no
  third-party visual licence.
- [ ] Both clues are readable for children ages 6–9.
- [ ] Clue one sets up the mistaken identity without naming the answer.
- [ ] Clue two narrows to graphite without repeating clue one.
- [ ] No answer label appears before the countdown finishes.
- [ ] The cutaway is large and clear in portrait.
- [ ] The fun fact matches the episode's finale and its source.
- [ ] The owl and all text stay inside the vertical safe area.
- [ ] The Short stands on its own, not as a cropped episode scene.

## Decision

- Reviewer: Project owner
- Review date (YYYY-MM-DD): 2026-09-15
- [x] Editorial presentation approved
- [x] Sarvam narration approved for generation
- Notes: Reviewed in Studio on 2026-09-15 — "video looks fine now .. proceed
  further and generate audio". That covers the visuals and authorises narration
  generation. The fact and rights checklists above are still open, so
  `review.status` stays `draft` and no production render can run yet.

## Approval basis (recorded 2026-09-15)

`review.status` was set to `approved` on the project owner's instruction to
render both videos for publishing, given after reviewing the visuals in Studio
and listening to the generated narration.

What each gate rests on:

- **Rights** — objectively clear. Neither video uses a third-party image. The
  cutaway is drawn in code, the music bed is synthesised locally from a recipe
  in this repo, the narration is generated, and the only image in either render
  is the shared WonderOwl mascot, whose provenance and SHA-256 are recorded in
  the root `asset-licenses.json`.
- **Editorial** — the project owner reviewed both videos in Remotion Studio and
  approved the presentation, then approved the narration after listening.
- **Facts** — every question carries a source ID that the `teardown` validator
  matches against `researchSources`, and the two contested claims are documented
  in the fact-check section above: the 35-mile line, which the episode itself
  says does not hold up, and the 1889 yellow-paint story, which is hedged as
  "the story goes" on screen and in narration. The owner did not work through
  the per-question checklist item by item; approval was given as an instruction
  to publish.

## Post-generation audio QA

- [ ] Listen to `outputs/short_everyday_objects_202609_graphite_01.mp4` end to end.
- [ ] Confirm "graphite" is pronounced clearly.
- [ ] Confirm the eight-second clue pacing feels natural, not slow.
- [ ] Approve the rendered Short for upload.
