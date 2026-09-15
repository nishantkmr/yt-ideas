# What's Inside a Pencil? — Review

Content file: `content/everyday-objects-pencil/content.json`

## Fact check

Every question names a source ID, and the `teardown` format's validator fails
the build if one is missing or unknown. Two claims that circulate widely were
checked and deliberately handled:

- **The 35-mile line.** The familiar "a pencil draws a line 35 miles long" comes
  from a 2007 *Discover* magazine item. Rob Eastaway's working in *Plus*
  magazine (University of Cambridge) puts everyday writing closer to one or two
  miles, so the episode asks about the word count instead — the half of the
  claim that survives checking — and the answer says out loud that the mileage
  version does not.
- **The yellow pencil.** The 1889 Koh-I-Noor story is told consistently by
  popular history but rests on no primary source, so both the on-screen text and
  the narration say "the story goes" rather than stating it as settled fact.

Two claims from the original outline were dropped for want of a source: that
hexagonal pencils are cheaper to cut than round ones, and that the ferrule
exists because glue alone could not hold an eraser.

## Review checklist

- [ ] Every question's answer matches its cited source.
- [ ] The yellow-paint answer keeps its "the story goes" hedge.
- [ ] The final answer states plainly that the 35-mile claim does not hold up.
- [ ] Distractors are plausible, not silly.
- [ ] The cutaway never labels a part before the countdown ends.
- [ ] Each close-up is recognisable on a phone screen.
- [ ] The line in the final reveal reads as one continuous pencil line.
- [ ] Reading times suit a 7–10 year old.
- [ ] Nothing in the episode encourages chewing or swallowing a pencil.
- [ ] The episode feels like a teardown, not the digestion episode with new nouns.

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

- [ ] Listen to `outputs/everyday_objects_202609_pencil_01.mp4` end to end.
- [ ] Confirm "graphite", "graphene" and "ferrule" are pronounced clearly.
- [ ] Confirm no narration cue is clipped by its scene.
- [ ] Confirm narration sits clearly above the workshop music bed.
- [ ] Approve the rendered episode for upload.
