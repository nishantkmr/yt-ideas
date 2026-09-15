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
- The initial animal video has been published. The next production pillar is
  the human body, and its videos should introduce topic-specific storytelling
  or interactions rather than reuse the animal quiz structure with new nouns.

## Current technology

- Remotion 4, React 19 and TypeScript.
- Composition entry point: `src/index.ts`.
- `TriviaShort`: portrait, 1080x1920 at 30 FPS.
- `TriviaEpisode`: landscape, 1920x1080 at 30 FPS.
- Each video is a self-contained bundle under `content/<slug>/`: its
  `content.json`, its own `asset-licenses.json`, its `review.md`, and its images
  and narration under `media/`. `public/` holds only shared brand media.
- Remotion's `staticFile()` only reaches `public/`, so bundle media is mirrored
  into the ignored `public/content/<slug>/` before a render. The bundle is the
  source of truth; everything that reads bytes reads the bundle, so a fresh
  clone validates before any mirror exists.
- Video-family code lives in `src/packs/<pack>/`, which declares its themes,
  presentation formats, visual types and their rules. The compositions and the
  validator read the pack registries instead of naming a family. See
  `src/packs/README.md` before adding one.
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
- Future thumbnails should match the approved Human Body thumbnail direction:
  premium colorful 3D artwork, a recognizable WonderOwl mascot, bold high-
  contrast typography that remains readable on a phone, one clear visual story,
  and uncluttered composition. Mystery thumbnails must not reveal the answer.
- The video itself must deliver the thumbnail's energy and promise. Open with a
  strong topic-specific visual hook, use expressive mascot moments and clear
  motion or transformation, and keep the educational payoff visually engaging.
  Do not use misleading clickbait or turn the thumbnail style into an identical
  mass-produced template; vary the world, composition and signature moment by
  topic.
- Current timing is defined centrally; episode question stages are 6 seconds,
  short clue stages are 4 seconds and countdowns are 4 seconds.
- A Short may use `clueTimeSeconds` (4–10 seconds) when its narrated clues need
  more breathing room; the stomach mystery uses five seconds per clue.
- Episode questions and choices remain continuously mounted while the timer
  appears as a compact pill inside the question card; do not replay the question
  entrance animation or use a detached countdown element at countdown time. A
  question may set `readingTimeSeconds` (6–15 seconds) when sentence-length
  choices need more reading time; the digestion finale uses 10 seconds. An
  `answerTimeSeconds` override (8–15 seconds) keeps longer narrated explanations
  from being clipped without slowing every answer in the episode.
- Mascot speech or celebration text must never cover the owl's face. On the
  episode outro, the proud-message bubble sits below the owl.
- Episode outros may use an age-appropriate call to action. The digestion episode
  asks viewers to involve a grown-up before subscribing to support WonderOwl Quiz.
  An episode may use `outroTimeSeconds` (9–15 seconds) when its narrated closing
  message needs longer than the default 9 seconds.

## Narration

- Production narration uses Sarvam AI Bulbul v3 with the preset `suhani` voice.
- The API key belongs only in the ignored `.env` file as `SARVAM_API_KEY`.
  Never print, expose or commit it.
- `npm run generate:voiceover` uses content fingerprints and reuses unchanged
  WAV files. It must not spend API credits on unchanged text and removes stale
  MP3/WAV cues from content-specific narration folders after a successful run.
- `npm run generate:voiceover:force` intentionally regenerates every cue and
  should be used only when explicitly needed.
- Narration wording lives in `scripts/narration-cues.mjs`, not in the Python
  synthesiser. Python is a plain text-to-speech renderer driven by the cue sheet
  that module builds; it holds no script text and branches on no video's
  subject. A single video may override individual lines with
  `narration.script: {<cue>: "text"}` in its `content.json`, which is validated
  against the known cue names so a typo'd key fails instead of doing nothing.
- Every cue is fingerprinted by its text, so editing a string in either place
  re-spends Sarvam credits on narration that may already be approved. Change
  wording deliberately, and run `npm run generate:voiceover:check` first: it
  reports what would be billed and generates nothing.
- The cue set is a contract between the cue builder, the `<Voiceover>` asset
  paths and the validator's per-scene budgets. Adding or renaming a cue in one
  place without the others fails at sheet-build time rather than orphaning
  approved audio.
- `npm run generate:sfx` recreates the local countdown tick without an API.
- Theme-specific background music is generated locally with
  `npm run generate:music` from the recipe in each pack manifest. The original
  procedural WAV loops live under `public/audio/music/`, play quietly beneath
  narration and require no external music license. An existing bed is never
  regenerated without `--force`, because its hash is recorded in every manifest
  and `Math.sin` is implementation-defined, so a future Node could otherwise
  change the music inside an already published video.
- Approved episode renders disable Remotion's parallel encoding because long,
  audio-heavy renders can otherwise race while cleaning a shared temporary
  audio directory on Windows. This is handled automatically by
  `npm run render:content -- <slug>`.
- Sarvam AI is the only supported voice-over path. Edge TTS and Kokoro are not
  needed for the production workflow and their dependencies should not be
  installed unless the user explicitly revisits that decision.

## Content and production safeguards

- Every content JSON needs a valid `review` object. AI-assisted content remains
  unapproved until schema, factual and human review are complete.
- Run `npm run validate:content` before preparing or rendering production work.
- `npm run prepare:content` creates an immutable, hashed manifest under the
  ignored `work/manifests/` directory after approval.
- `npm run render:content -- <slug> --preview` may render a voiceover-free draft
  for visual review. It forces narration off while retaining music and local
  sound effects, names the output as a preview, and does not weaken the approval
  requirement for production output.
- Visual rights are recorded in two tiers: the root `asset-licenses.json` for
  shared brand media, and a bundle-relative `asset-licenses.json` inside each
  video. Manifests pin both.
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
- Six visual themes and six presentation formats are available. Choose them
  to fit the story instead of rotating them mechanically.
- The Human Body implementation adds a `body-lab` visual theme, a
  `body-journey` presentation format, route progress, and ordering questions.
  Its original code-native digestive diagram hides labels during questions and
  uses a larger organ-specific close-up during answer reveals. Reveal diagrams
  include simple animated action cues—such as saliva droplets, enzyme sparkles,
  nutrient particles, and water droplets—so they teach a process rather than
  showing a static organ alone. The first draft follows a bite through digestion
  and must remain unapproved until factual, rights, and editorial review are
  complete.
- The digestion episode maps every question to a source ID and records difficult
  pronunciation checks. Its human checklist in its bundle was approved by the
  project owner on 2026-09-06, and Sarvam narration is enabled. The audio-enabled
  production render exists, but pronunciation and voice/music balance still need
  the project owner's post-generation listening approval before upload.
- The digestion episode title is `Where Does Your Food Go?`; its final question
  uses digestion-related misconceptions as distractors instead of implausible
  consequences involving the heart or lungs.
- The first Human Body companion Short is a stomach-focused two-clue mystery.
  It reuses the original code-native stomach close-up and churning animation in
  portrait format. The project owner approved its voiceover-free preview on
  2026-09-08, and Sarvam narration is enabled for final production. Its final
  narrated render exists, but pronunciation and mix balance still need the
  project owner's listening approval before upload.
- The stomach Short uses a dark body-lab gradient on its opening title card so
  the white “Can You Solve This Body Mystery?” text remains clearly legible.
- The approved Human Body upload artwork consists of a 16:9 digestion-journey
  thumbnail and a spoiler-free 9:16 organ-mystery cover. Their C2PA-bearing
  originals live in each bundle's own `media/assets/` directory
  (`content/human-body-digestion/media/assets/thumbnail.png` and
  `content/human-body-stomach-short/media/assets/cover.png`); upload-ready JPEG
  copies live under the ignored `outputs/thumbnails/` directory and are still
  produced by hand — no pipeline step generates them.
- Remotion Studio's default `TriviaEpisode` props point to the Human Body
  digestion draft. Renders resolve any bundle by slug or content id through
  `npm run render:content -- <slug>`; a path to a `content.json` also works.
- `npm run video -- <slug>` builds one video end to end: validate, catalog
  audit, music, sound effects, voiceover, manifest, render. It skips steps with
  nothing to do, and `--dry-run` reports what it would do without ever calling
  the narration API. The human still writes and approves the content; the
  command only removes the seven-step chain that followed.
- Validation at step one is structural, because the music bed and narration it
  would otherwise demand are produced by later steps. The strict pass still runs
  at the manifest step, before any production render.
- A video whose content changed since it was rendered fails rather than being
  silently skipped, and an output with no render stamp is treated as an
  interrupted render and rebuilt.
- The props snapshots under `outputs/render-props-*.json` are a record of what
  was rendered, not a way to re-render it. Three of them predate the bundle
  migration and still name `audio/<contentId>`, a layout that no longer exists,
  so feeding an old snapshot back to Remotion fails on missing media. All three
  belong to the two Human Body videos, and both are tagged, so reproduce an old
  render from its `release/<slug>-v1` tag instead — the tagged tree has the
  matching paths and media together. The two animal videos shipped before that
  convention and have no tag, so their only reproducible form is the current
  bundle.
- The catalog audit always reads the whole catalog, because duplicate ids and
  repeated question text cannot be seen from one file. `--focus=<slug>` makes
  only the findings involving that video blocking.
- Start new drafts from `content/_template/`; see `content/_template/README.md`.
- `npm run render:short` and `npm run render:episode` have been removed. They
  pointed at the first animal video and carried `--force`, so running one would
  have silently overwritten a published video with the wrong content.
- The third pillar is everyday objects: take one ordinary thing apart and look
  at every layer. Its `everyday-objects` pack owns the `teardown` format and a
  code-drawn pencil cutaway, and adds no theme of its own — a teardown happens
  on a workbench, and the core pack's `workshop` bed was already there. A pack
  borrowing another's theme is allowed and documented in `src/packs/README.md`.
- `teardown` demands a named layer (`journeyStop`) and a source ID on every
  question, the same bar as `body-journey`, because a teardown's whole promise
  is that each surprise is a real property of a real object.
- Two things left the human body pack when a second family needed them: the
  `route-progress` chrome is registered by the core pack now, and the "Correct
  route" headline over an ordering answer became `orderedAnswerLabel` in a
  format's own copy, defaulting to "Correct order". body-journey keeps its
  original wording, so the digestion episode is unchanged.
- The pencil episode is `What's Inside a Pencil?`, ten layers from the point to
  the line it draws. Its companion Short is a two-clue graphite mystery. Both
  have passed the content review gates and have Sarvam narration. Their final
  renders still need the project owner's listening approval before upload.
- The Everyday Objects upload artwork consists of a 16:9 pencil-cutaway
  thumbnail and a spoiler-free 9:16 pencil-mystery cover, generated on
  2026-09-15 in the approved premium 3D WonderOwl direction. Their untouched
  C2PA-bearing masters live at
  `content/everyday-objects-pencil/media/assets/thumbnail.png` and
  `content/everyday-objects-graphite-short/media/assets/cover.png`; upload-ready
  JPEG copies live under the ignored `outputs/thumbnails/` directory. The
  project owner still needs to visually approve them before publishing.
- Two widely repeated pencil facts did not survive checking, and the episode
  says so. "A pencil draws a line 35 miles long" traces to a 2007 Discover item
  and is an order of magnitude out by Plus magazine's arithmetic, so the finale
  asks for the word count instead and names the mileage claim as too good to be
  true. The 1889 yellow-paint origin is popular history with no primary source,
  so it is told as "the story goes" on screen and in the narration. Claims
  dropped for want of a source: hexagons being cheaper to cut, and the ferrule
  existing because glue alone failed.
- The full operating plan and current policy links are in
  `SCALING_AND_MONETIZATION.md`.

## Common commands

The current checkout is Ubuntu, so these are bash. The project has also been
worked on from Windows, where PowerShell may block `npm.ps1` and `npm.cmd` is
the way in; nothing in the repo is platform-specific either way.

```bash
npm run dev                        # Studio; syncs the media mirror first
npm run typecheck
npm run validate:content           # whole catalog, or -- <slug>
npm run audit:catalog              # or -- --focus=<slug>
npm run prepare:content
npm run generate:voiceover         # generate:voiceover:check spends nothing
npm run generate:sfx
npm run generate:music
npm run sync:media                 # rebuild public/content/ by hand
npm run still -- <slug> <frame>     # one frame, about ten seconds
npm run video -- <slug>            # the whole pipeline
npm run video:check -- <slug>      # plan it without generating anything
npm run render:content -- <slug>
```

`npm run dev` and `npm run build` rebuild the media mirror through `predev` and
`prebuild` hooks. Invoking `remotion studio` or `remotion render` directly skips
those hooks, so run `npm run sync:media` first or the render reads a stale or
absent mirror.

Rendered files are written to `outputs/` and MP4s are intentionally ignored by
Git.

Remotion downloads its own Chrome Headless Shell on first render. That download
does not complete on this machine: it leaves a lone `download.lock` under
`node_modules/.remotion/chrome-headless-shell/`, and the render then sits at low
CPU with no output and no error until it is killed. So pass the installed
browser every time (or export `REMOTION_BROWSER_EXECUTABLE`), and delete a stale
lock if one was left behind:

```bash
npm run render:content -- <slug> --browser-executable=/opt/google/chrome/chrome
```

Scripts are ES modules (`"type": "module"`). Node's type stripping lets the
`.mjs` tooling import plain `.ts` modules directly, so shared definitions do not
have to be duplicated between the build scripts and the Remotion sources. Such a
shared `.ts` file must use erasable syntax only: no `enum`, no `namespace`, no
constructor parameter properties, and type-only imports written as
`import type`.

## Render cost

A full render costs roughly 0.24 seconds per frame on this machine, so an
episode takes 20-30 minutes and a Short takes 4-5. That is the measured steady
rate, not a regression: a 300-frame render measured 100.58s before the pack and
bundle restructure and 100.79s after, and the first commit in the repo was no
faster. Concurrency, `--gl`, and `--jpeg-quality` were all measured and none of
them help materially; about half the cost is per-frame work that does not scale
with resolution, and the GPU never engages under headless Chrome here.

So do not render a video to check a visual change. Use `npm run dev` for
real-time playback, or `npm run still -- <slug> <frame> [<frame> ...]` for
single frames at about ten seconds each — that is what the whole design phase of
the Human Body episode was done with. Reserve the full render for content that
is finished, which the pipeline already skips when nothing changed.

Stills are deliberately ungated: they run on an unapproved draft and force
narration off, because a scene's WAV files do not exist yet while its visuals
are still being designed. They write no render stamp and no manifest, so a still
can never be mistaken for a shippable render. Output lands in `outputs/qa-<slug>-
<frame>.png`, which Git ignores.

Studio lists every bundle under a `Videos` folder, one composition per video, so
previewing a new draft needs no source edit. The two compositions under
`Pipeline` are what `render-content.mjs` and `render-still.mjs` render through,
chosen from the content's kind; renaming them breaks both scripts. A new video is
registered by adding it to the `episodes` or `shorts` array in `src/Root.tsx` —
the same two-line cost as registering a pack.

## Working rules for future sessions

- Confirm the active working directory is the checked-out `yt-ideas` repository
  before editing. The current Ubuntu checkout is
  `/home/nku100/MySpace/projects/yt-ideas`.
- Inspect actual rendered frames for visual changes; a successful typecheck or
  bundle is not sufficient visual QA. Single frames, not a full render — see
  Render cost above.
- Preserve unrelated user changes in a dirty worktree.
- Committing to a local branch is pre-authorized: land each reviewable phase as
  its own commit without asking. Do not push, publish or upload unless the user
  explicitly asks.
- Videos are catalog entries, not code versions, so they all live on `main`.
  Use a short-lived `video/<slug>` branch while producing one, merge it on
  publish, and tag the published commit `release/<slug>-v1` for reproducibility.
  Never keep a long-lived per-video branch: engine fixes would stop propagating
  and the cross-catalog originality audit could no longer see the whole catalog.
- Prefer small, reviewable phases and explain consequential architecture
  changes before expanding the system.
- Update this context file when a durable product, workflow, branding, voice or
  monetization decision changes.
