# Starting a new video

Copy the skeleton that matches the format, name it for the video, and replace
the placeholders:

```bash
cp -r content/_template/episode content/<slug>
```

Then, inside `content/<slug>/`:

1. `content.json` — set `id`, and replace every `REPLACE-ME` in `audioBase` and
   in each `visual.asset` with `<slug>`. Those paths are how the render finds
   the video's own media.
2. `creative.pack` — the pack whose theme, format and visuals this video uses.
   `core` unless it needs a family-specific one (see `src/packs/README.md`).
3. `media/assets/` and `media/audio/` — this video's images and narration.
   Narration is generated, so leave `media/audio/` empty.
4. `asset-licenses.json` — one record per image, with paths relative to the
   bundle (`assets/x.png`, not `content/<slug>/assets/x.png`) and a real
   SHA-256. Delete the placeholder record if the video uses no images.
5. `review.md` — the human sign-off, written before `review.status` is flipped
   to `approved`.
6. `src/Root.tsx` — add the bundle to the `episodes` or `shorts` array so
   Remotion Studio lists it. Two lines, and without them `npm run dev` will not
   show the new video.

The directories starting with `_` are skeletons and are skipped by every
command, so an incomplete template never fails validation.

Check progress at any point without generating anything:

```bash
npm run video:check -- <slug>
```

Design it with Studio and single frames, not with renders — a full episode costs
20-30 minutes, one frame about ten seconds:

```bash
npm run dev
npm run still -- <slug> <frame> [<frame> ...]
```

Stills work on a draft with narration not yet generated, so they are available
from the first question you write.
