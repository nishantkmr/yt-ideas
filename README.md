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
[7/7] render        OK    outputs/human_body_202609_digestion_01.mp4  26m36s
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
npm run still -- <slug> <frame>     # one frame in ~10s, for visual iteration
npm run dev                         # Remotion Studio; lists every bundle
npm run typecheck
```

## Designing a video

The render is the slow part: about 0.24 seconds per frame, so 20-30 minutes for
an episode and 4-5 for a Short. That is the measured rate on current hardware,
not a regression, and tuning concurrency, `--gl` or JPEG quality does not move
it. So build the video without rendering it, and render once at the end.

```bash
npm run dev                          # Studio, real time, every bundle listed
npm run still -- <slug> 900 1500     # two frames, about ten seconds each
```

Studio plays audio, so narration timing and mix balance are checkable there too.
Stills run on an unapproved draft and force narration off, because a scene's WAV
files do not exist yet while its visuals are still being designed; they write no
render stamp, so a still can never be confused for a shippable render.

Only when the content is finished is `npm run video -- <slug>` worth the wait,
and it skips the render entirely if nothing has changed since last time.

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

## Branching and commits

Videos are catalog entries, not versions of the code, so everything lands on
`main`. There is no develop branch and no long-lived per-video branch: the
originality audit has to see the whole catalog at once, and an engine fix on
`main` has to reach every video that ships after it.

Work on a short-lived branch, then fast-forward it into `main` and delete it.
Four prefixes are in use:

| Prefix | For |
| --- | --- |
| `video/<slug>` | Producing one video, from first draft to publish. |
| `feat/<topic>` | New capability in the engine, packs or tooling. |
| `fix/<topic>` | A defect in something that already shipped. |
| `chore/<topic>`, `docs/<topic>` | Housekeeping and documentation. |

**History is linear — there are no merge commits in this repository.** Merge
with `--ff-only` so it stays that way, and rebase your branch if `main` moved
underneath you:

```bash
git checkout main
git merge --ff-only <branch>
git branch -d <branch>
```

Commit subjects follow Conventional Commits with an optional scope naming the
area — `feat(packs):`, `fix(audio):`, `fix(narration):`, `docs:`, `chore:`.
Write the subject as the effect on the product rather than the mechanism
(`fix(narration): stop the speech engine reading "!" aloud as "factorial"`,
not `update regex`), and use the body to record why the change was needed,
because that reasoning is what a future reader cannot reconstruct from the
diff. Land each reviewable phase as its own commit instead of one large one.

### Tagging a published video

When a video goes live, tag the commit it was published from with an annotated
tag per upload, naming the video and its content id:

```bash
git tag -a release/<slug>-v1 -m "<Title> - <what it is> (<content id>)"
```

An episode and its companion Short each get their own tag, both on the same
commit. This is not ceremony: the props snapshots under
`outputs/render-props-*.json` record what was rendered but cannot re-render it,
and some predate the bundle migration entirely. **A release tag is the only
reproducible form of an old render**, because the tagged tree holds the content,
the media and the matching paths together. The two animal videos shipped before
this convention and have no tag, which is why their only reproducible form is
the current bundle.

Tags are not pushed by a plain `git push`; send them explicitly with
`git push origin --tags`.

Agent-facing rules — what may be committed without asking, and what may never
be pushed — live in `.agents/PROJECT_CONTEXT.md`.
