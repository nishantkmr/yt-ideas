# Kids Trivia Studio - Project Context

## Purpose

This repository is a local production system for **WonderOwl Quiz**, a proposed
YouTube channel creating original, friendly and educational general-knowledge
trivia for children. The videos should encourage curiosity, thinking and
learning, not function as low-effort, mass-produced quiz content.

The working audience is children and families. Treat uploads as "Made for
kids" unless the user deliberately changes the audience strategy.

## Product direction

- Produce vertical YouTube Shorts and landscape quiz episodes from shared
  components.
- Keep the channel expandable beyond animals into science, geography, space,
  inventions, the human body and other age-appropriate topics.
- Make each episode materially distinct in its questions, explanations,
  educational value and presentation. A shared owl, intro, outro and visual
  system are intentional brand elements.
- Maintain a warm, playful, comforting tone. Never talk down to children.
- Preserve human review before production or publishing.

## Current technology

- Remotion 4, React 19 and TypeScript.
- Composition entry point: `src/index.ts`.
- `TriviaShort`: portrait, 1080x1920 at 30 FPS.
- `TriviaEpisode`: landscape, 1920x1080 at 30 FPS.
- Editorial content lives in human-readable JSON under `src/data/`.
- Scene durations come from `src/config/timing.json`; do not scatter hardcoded
  timings through compositions.
- Rendering remains local for now. Do not introduce cloud infrastructure,
  databases or automatic publishing without an explicit request.

## Established creative decisions

- The reusable owl is the host and prospective WonderOwl Quiz mascot.
- Animal pictures must not reveal the answer during the question stage. Show
  them only during the answer reveal.
- Questions lead into a visual countdown. Countdown audio is a locally generated
  tick, not repeated narration.
- Answer reveals and fun facts need enough time for children to absorb them.
- Every video ends with a positive conclusion and thank-you celebration.
- Current timing is defined centrally; episode question stages are 6 seconds,
  short clue stages are 4 seconds and countdowns are 4 seconds.

## Narration

- Production narration uses Sarvam AI Bulbul v3 with the preset `suhani` voice.
- The API key belongs only in the ignored `.env` file as `SARVAM_API_KEY`.
  Never print, expose or commit it.
- `npm run generate:voiceover` uses content fingerprints and reuses unchanged
  WAV files. It must not spend API credits on unchanged text.
- `npm run generate:voiceover:force` intentionally regenerates every cue and
  should be used only when explicitly needed.
- `npm run generate:sfx` recreates the local countdown tick without an API.
- Theme-specific background music is generated locally with
  `npm run generate:music`. The five original procedural WAV loops live under
  `public/audio/music/`, play quietly beneath narration and require no external
  music license.
- Approved episode renders disable Remotion's parallel encoding because long,
  audio-heavy Windows renders can otherwise race while cleaning a shared
  temporary audio directory. This is handled automatically by
  `npm run render:content -- <episode-json>`.
- Edge and Kokoro remain comparison/fallback options; they are not the selected
  production narrator.

## Content and production safeguards

- Every content JSON needs a valid `review` object. AI-assisted content remains
  unapproved until schema, factual and human review are complete.
- Run `npm run validate:content` before preparing or rendering production work.
- `npm run prepare:content` creates an immutable, hashed manifest under the
  ignored `work/manifests/` directory after approval.
- `asset-licenses.json` is the machine-readable visual-rights registry.
- `ASSET_LICENSES.md` explains image, narration and sound-effect provenance.
- Approved content must not reference an image without verified commercial-use
  provenance and a matching SHA-256 hash. Add or replace the rights record when
  adding or replacing an image.
- Current PNGs were generated through the OpenAI Media Service API and retain
  embedded C2PA provenance. Do not strip or overwrite the originals casually.
- Preserve source links, license records, receipts and generation evidence for
  all future third-party or generated media.

## Monetization quality bar

- Avoid bulk-producing near-identical videos with only names or pictures
  swapped. YouTube evaluates repetitive or easily mass-produced channels as
  potentially inauthentic.
- Use original questions, accurate explanations, varied formats, themed
  episodes and meaningful educational facts.
- Verify facts manually and keep titles, thumbnails and descriptions honest and
  distinct.
- The likely growth strategy is Shorts for discovery plus longer themed
  episodes for public watch hours.
- Scale through editorial variety, not automated volume. Every content file has
  a creative brief (`visualTheme`, `presentationFormat`, target age, hook,
  learning goal and signature moment) plus research sources and three approval
  gates.
- Five visual themes and five presentation formats are available. Choose them
  to fit the story instead of rotating them mechanically.
- `npm run validate:content` includes a cross-catalog originality/diversity
  audit. Use `templates/` for new drafts and `npm run render:content -- <json>`
  for a validated, approved, immutable-props render.
- The full operating plan and current policy links are in
  `SCALING_AND_MONETIZATION.md`.

## Common commands

On this Windows machine, use `npm.cmd` if PowerShell blocks `npm.ps1`.

```powershell
npm run dev
npm run typecheck
npm run validate:content
npm run prepare:content
npm run generate:voiceover
npm run generate:sfx
npm run generate:music
npm run render:short
npm run render:episode
```

Rendered files are written to `outputs/` and MP4s are intentionally ignored by
Git.

## Working rules for future sessions

- Confirm the active working directory is
  `D:\Nishant\projects\kids-trivia-studio` before editing.
- Inspect actual rendered frames for visual changes; a successful typecheck or
  bundle is not sufficient visual QA.
- Preserve unrelated user changes in a dirty worktree.
- Do not commit, push, publish or upload unless the user explicitly asks.
- Prefer small, reviewable phases and explain consequential architecture
  changes before expanding the system.
- Update this context file when a durable product, workflow, branding, voice or
  monetization decision changes.
