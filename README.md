# Kids Trivia Studio

Local production system for original, human-reviewed YouTube Kids GK/trivia
videos, covering vertical shorts and landscape episodes. The scaling and
monetization workflow is documented in `SCALING_AND_MONETIZATION.md`.

## Commands

```powershell
npm run dev
npm run typecheck
npm run generate:voiceover
npm run generate:sfx
npm run sample:kokoro
npm run validate:content
npm run audit:catalog
npm run prepare:content
npm run build
npm run render:short
npm run render:episode
npm run render:content -- src/data/animal-episode.json
```

The two compositions currently use sample JSON. Phase 2 includes:

- Shared color, typography, spacing, card, progress, countdown, and answer styles.
- Animated scene entrances, exits, countdown ticks, option reveals, and answer celebrations.
- Dedicated multiple-choice, true/false, picture, clue, boss, and score states.
- A reusable owl host and a complete answer-reveal image set for all animal questions.
- Deliberate question, countdown, answer, fun-fact, and celebratory outro pacing.

Generated question pipelines are reserved for a later Phase 3 slice.

## Scalable creative system

Each content file now includes a creative brief, research-source ledger, and
three explicit human approval gates. Five visual themes and five presentation
formats can be selected per video. The channel mascot remains consistent, while
background language, palette, framing copy, learning goal, hook, and signature
moment can vary by series.

Start new work from `templates/episode.template.json` or
`templates/short.template.json`. `npm run validate:content` also runs a catalog
audit for duplicate IDs, near-duplicate editorial intent, question-format
diversity, difficulty variety, and over-concentration once the catalog grows.

Render any approved source file with:

```powershell
npm run render:content -- src/data/<content-file>.json
```

The command validates the selected JSON, snapshots immutable props under
`outputs/`, and refuses to overwrite an existing MP4 unless `--force` is explicitly
supplied.

Use `--check` to test one file without starting a render:

```powershell
npm run render:content -- src/data/<content-file>.json --check
```

## Phase 3 content gate

Every JSON content file now carries a `review` status. `npm run validate:content`
checks its structure, answers, question rules, IDs, and visual assets. Once a
human marks the content as approved, `npm run prepare:content` creates a hashed,
review-ready render manifest under `work/manifests/`. Draft content cannot be
prepared for production. Visual validation also requires a verified commercial
rights entry and matching SHA-256 hash in `asset-licenses.json`; see
`ASSET_LICENSES.md` for the project rights ledger.

## Phase 3 narration

Narration is derived from the reviewed on-screen content, which keeps spoken and
written answers synchronized. Add `SARVAM_API_KEY=...` to the ignored `.env`
file, then run `npm run generate:voiceover` to create Sarvam Bulbul v3 WAV cues
with the selected Suhani voice under `public/audio/`. Each cue is placed inside
its matching Remotion sequence, so it starts with the relevant scene. The
generator caches a fingerprint of each cue and reuses its WAV when the text,
voice, and synthesis settings are unchanged. Use
`npm run generate:voiceover:force` only when every cue needs to be refreshed.
Countdowns use a locally generated tick instead of narration;
recreate it at any time with `npm run generate:sfx`. The former Edge generator
remains available through `npm run generate:voiceover:edge`.

For the fully local Kokoro comparison, run `npm run setup:kokoro` once and then
`npm run sample:kokoro`. This generates an `af_heart` WAV set and comparison
props without replacing the configured production narration. Render the comparison
with:

```powershell
npx remotion render src/index.ts TriviaShort outputs/animal-guess-zebra-kokoro-short.mp4 --props=work/kokoro-af_heart-short-props.json
```

To compare Sarvam Bulbul v3 voices, place `SARVAM_API_KEY=...` in the ignored
`.env` file and run `npm run sample:sarvam`. The command generates separate
`priya`, `ishita`, and `suhani` audio and props without changing the configured
voice.
