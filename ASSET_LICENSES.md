# Asset Rights Ledger

This ledger records the provenance and commercial-use basis for production
media used by Kids Trivia Studio. Keep it with the project as evidence for
copyright checks and YouTube Partner Program review.

## Original background music

The five theme beds in `public/audio/music/` are deterministic procedural
syntheses created by `scripts/generate-music.mjs`. They contain no third-party
recordings, samples, copied melodies, or external model output. The project may
use and modify these original generated waveforms commercially. Regenerating a
track from the script provides a reproducible provenance trail.

| Track | Intended mood | Source |
| --- | --- | --- |
| `jungle.wav` | Marimba-like explorer rhythm | Local procedural synthesis |
| `cosmic.wav` | Spacious bells and pulse | Local procedural synthesis |
| `ocean.wav` | Flowing tones and droplets | Local procedural synthesis |
| `atlas.wav` | Plucked travel rhythm | Local procedural synthesis |
| `workshop.wav` | Playful toy-synth motion | Local procedural synthesis |

## Visual assets

All current PNG files in `public/assets/` were generated through the OpenAI
Media Service API. Each original file contains an embedded C2PA claim naming
`OpenAI Media Service API` as its claim generator. The exact verified file
hashes and licensing fields are stored in `asset-licenses.json` and enforced by
`npm run validate:content`.

OpenAI's applicable account terms assign Output rights to the user, subject to
those terms and third-party rights. Retaining C2PA metadata and SHA-256 hashes
connects this record to the exact files reviewed here.

| Asset | Purpose | Commercial use | Provenance |
| --- | --- | --- | --- |
| `bat.png` | Answer illustration | Verified | Embedded C2PA |
| `cat.png` | Answer illustration | Verified | Embedded C2PA |
| `cheetah.png` | Answer illustration | Verified | Embedded C2PA |
| `dolphin.png` | Answer illustration | Verified | Embedded C2PA |
| `elephant.png` | Answer illustration | Verified | Embedded C2PA |
| `giraffe.png` | Answer illustration | Verified | Embedded C2PA |
| `octopus.png` | Answer illustration | Verified | Embedded C2PA |
| `penguin.png` | Answer illustration | Verified | Embedded C2PA |
| `platypus.png` | Answer illustration | Verified | Embedded C2PA |
| `quiz-owl.png` | Original channel mascot | Verified | Embedded C2PA |
| `tiger.png` | Answer illustration | Verified | Embedded C2PA |
| `zebra.png` | Answer illustration | Verified | Embedded C2PA |
| `thumbnails/human-body-digestion-thumbnail.png` | Human Body episode thumbnail master | Verified | Embedded C2PA |
| `thumbnails/human-body-stomach-short-cover.png` | Stomach mystery Short cover master | Verified | Embedded C2PA |

Upload-ready JPEG derivatives are stored under the ignored
`outputs/thumbnails/` directory. The C2PA-bearing PNG masters remain unchanged
under `public/assets/thumbnails/` as the provenance record.

License reference: [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/)

## Narration

Production narration under `public/audio/animals_001/` and
`public/audio/short_animal_001/` was generated on the project owner's Sarvam
account with the preset Suhani voice using Bulbul v3. Sarvam states that Output
generated on an account while credits are consumed has commercial production
rights, including Output generated with signup credits.

License reference: [Sarvam commercial licensing](https://docs.sarvam.ai/api/getting-started/commercial-licensing)

## Sound effects

`public/audio/sfx/countdown-tick.wav` is original procedural audio generated
locally by `scripts/generate-sfx.mjs`; it contains no third-party recording.

## Adding or replacing media

Before approving content for production:

1. Add every new visual to `asset-licenses.json`.
2. Record its source, commercial-use status, license URL, provenance and exact
   SHA-256 hash.
3. Preserve receipts, generation records or license screenshots outside the
   repository when applicable.
4. Run `npm run validate:content`. A missing record, unverified right or changed
   file hash blocks validation.

This ledger documents project records and is not legal advice.
