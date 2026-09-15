# Content packs

A pack is one video family. The human body pack owns the `body-lab` theme, the
`body-journey` format and the digestive diagram; the everyday objects pack owns
the `teardown` format and the pencil cutaway; the core pack owns the shared
WonderOwl themes, formats, picture visuals and both progress indicators.

A pack does not have to own everything it uses. The everyday objects pack adds
no theme at all: a teardown happens on a workbench, and the core pack's
`workshop` bed was already there.

Before packs existed, a new family meant editing four enum lists, a music table,
a copy table, three dispatch branches and one 1513-line stylesheet, and one
video's anatomy ended up in the vocabulary every other video was checked
against. A pack keeps all of that in one directory.

## Adding a pack

Four files, plus one line in each registry:

```
src/packs/<pack>/
  manifest.ts      themes, formats, visual types, and their validation rules
  components.tsx   the React components, and the stylesheet import
  theme.css        styling this pack owns
  <Component>.tsx  whatever it draws
```

Then register it:

- `src/packs/manifest-registry.ts` — add to `PACKS`, and to the `QuizVisual`
  union if the pack adds a visual shape.
- `src/packs/component-registry.tsx` — add to `PACK_COMPONENTS`.

Nothing else needs to change. The validator, the music synthesiser, the
presentation copy and the compositions all read the registries.

## Two rules that are not obvious

**Manifests must import nothing and use only erasable TypeScript.** They are
read two ways: compiled into the Remotion bundle, and loaded directly by the
build scripts through Node's type stripping. That is what removes the second
copy of every enum. So no `enum`, no `namespace`, no decorators, no constructor
parameter properties — and no `import` of anything but types from `contract.ts`.
Relative imports inside the pack graph need explicit `.ts` extensions, because
Node's resolver does not guess them.

Pack validators are therefore pure and synchronous. Anything touching the file
system — existence, hashes, audio duration — stays in the build scripts, driven
by declarative flags such as `requiresAsset`.

**Never give a pack's manifest and components the same basename.** Webpack
resolves `.ts` before `.tsx`, so an `index.ts` silently shadows an `index.tsx`:
the components simply never render, with no error anywhere. Hence
`manifest.ts` / `components.tsx`.

## Styling

A pack imports its own `theme.css` from `components.tsx`, so its styling arrives
with the components that need it.

Do not scope pack styles by the owning pack. A theme and a presentation format
can come from different packs — the stomach short pairs the human body theme
with the core `mystery` format — so keying styles off one pack would stop that
video's theme from applying at all. Theme rules carry `[data-theme=...]` and
component rules carry their own class names; both are already self-scoping.

Never name a pack stylesheet `*.module.css`. The bundler turns those into CSS
Modules with hashed class names, and every `className` string would quietly stop
matching.

## Adding a theme

Add it to the pack's `themes`, including a `music` recipe. The bed is
synthesised from that recipe by `npm run generate:music`, and validation
requires it to exist, so no other file changes.

Existing beds are never regenerated without `--force`: their hashes are recorded
in every manifest, and `Math.sin` is implementation-defined in ECMAScript, so a
future Node could otherwise change the music inside an already published video.

## Adding a visual

Declare it in the pack's `visualTypes` with `requiresAsset` — `false` for a
visual drawn in code, which has no file to license — then register `Question`
and `Answer` components in `components.tsx`. Omit `Question` when showing the
visual during the question would give the answer away.

`questionStageLayout: 'split'` puts a wide visual beside the choices instead of
above them.
