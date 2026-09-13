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

The directories starting with `_` are skeletons and are skipped by every
command, so an incomplete template never fails validation.

Check progress at any point without generating anything:

```bash
npm run video:check -- <slug>
```
