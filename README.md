# Kids Trivia Studio

Local production system for original, human-reviewed YouTube Kids GK/trivia
videos, covering vertical shorts and landscape episodes. The scaling and
monetization workflow is documented in `SCALING_AND_MONETIZATION.md`.

## Building a video

You write and approve the content; one command builds it.

```bash
npm run video -- <slug>
```

That runs validation, the catalog audit, the music bed, the countdown tick, the
voiceover, the manifest and the render, skipping whatever is already done:

```
[1/7] validate      OK    episode, approved
[2/7] catalog audit OK    no duplicate questions
[3/7] music         SKIP  body-lab.wav exists
[4/7] sfx           SKIP  countdown-tick.wav exists
[5/7] voiceover     OK    22 cues: 22 cached, 0 new
[6/7] manifest      OK    work/manifests/human_body_...-3c3c.json
[7/7] render        OK    outputs/human_body_202609_digestion_01.mp4  5m48s
```

A video is addressed by its directory slug or its content id. Useful flags:

| Flag | Effect |
| --- | --- |
| `--dry-run` | Report what would happen. Never calls the narration API. |
| `--preview` | Voiceover-free draft for visual review. Skips the manifest step. |
| `--force` | Re-render even when the output is already up to date. |
| `--from=<step>` | Resume after a failure, from `validate`, `audit`, `music`, `sfx`, `voiceover`, `manifest` or `render`. |
| `--skip-voiceover` | Leave narration alone. |
| `--browser-executable=<path>` | Use an installed browser instead of downloading one. |

`npm run video:check -- <slug>` and `npm run video:preview -- <slug>` are the
first two flags spelled out.

An unchanged video skips the render. A video whose content has changed since it
was rendered fails rather than silently shipping the old file; add `--force`
when replacing it is what you meant.

Every step is still an ordinary command, so any one of them can be run alone.
With no argument they cover the whole catalog:

```bash
npm run validate:content            # or -- <slug>
npm run audit:catalog               # always catalog-wide; --focus=<slug>
npm run generate:voiceover          # or -- <slug>
npm run generate:voiceover:check    # proves a run would spend no API credits
npm run prepare:content             # or -- <slug>
npm run render:content -- <slug>
npm run generate:music              # --theme=<name>, --force
npm run generate:sfx
npm run sync:media                  # rebuild public/content from the bundles
npm run dev                         # Remotion Studio
npm run typecheck
```

## How a video is stored

Each video is one directory under `content/`:

```
content/human-body-digestion/
  content.json          the script, the creative brief, the sources, the review gates
  asset-licenses.json   rights for this video's own images
  review.md             the human sign-off
  upload.md             the publishing package
  media/assets/         its images
  media/audio/          its narration cues
```

`public/` holds only what every video shares: the mascot, the theme music beds
and the countdown tick.

Remotion can only load media from `public/`, so each bundle's media is mirrored
into `public/content/<slug>/` before a render. That mirror is generated, ignored
by git and rebuilt automatically; the bundle is the source of truth. Everything
that reads bytes — validation, hashing, the voiceover generator — reads the
bundle, so a fresh clone validates correctly before any mirror exists.

Start a new video by copying a skeleton from `content/_template/`; see
`content/_template/README.md`.

## How the code is organised

`src/packs/` holds one directory per video family. A pack declares its themes,
presentation formats, visual types and the validation rules that go with them,
and registers the components that draw them. The compositions and the validator
read those registries rather than naming any family, so adding a family does not
touch shared code. See `src/packs/README.md`.

Scene durations live in `src/config/timing.json` and the maths that uses them in
`src/config/durations.mjs`, shared by the render and the build scripts so a
manifest cannot record a duration the video disagrees with.

Narration wording lives in `scripts/narration-cues.mjs`, and a video can
override individual lines through `narration.script` in its `content.json`.

## Review gates

Every `content.json` carries a `review` object with three gates. Validation
checks structure, answers, question rules, IDs, research sources and visual
rights; an image must have a verified commercial-use record and a matching
SHA-256 in a rights registry. `ASSET_LICENSES.md` explains the provenance of
everything in the project.

Draft content can be previewed but never rendered for production. The manifest
step is where the strict check runs, before any production render, and writes a
hashed, immutable record under `work/manifests/`.

## Narration

Production narration is Sarvam Bulbul v3 with the `suhani` voice. Put
`SARVAM_API_KEY=...` in the ignored `.env` file.

Each cue is fingerprinted by its text and voice settings, so unchanged narration
is reused and costs nothing. `npm run generate:voiceover:check` proves a run
would spend nothing before you start one. Countdowns use a locally generated
tick rather than narration.

Retiring a cue moves its audio into `work/stale-audio/` instead of deleting it,
and only when `--prune` asks for it.

## Theme music

Every visual theme has an original, locally synthesised loop under
`public/audio/music/`, generated from the recipe in its pack manifest with no
external service. Existing beds are never regenerated without `--force`, so a
published video's music cannot change underneath it.
