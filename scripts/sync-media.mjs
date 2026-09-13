import {CONTENT_OPTIONS, parseCli, selectTargets} from './cli.mjs';
import * as tools from './content-tools.mjs';
import {syncContentMedia} from './content-media.mjs';

// Rebuilds public/content/ from the content bundles. Renders do this for the
// video they are about; this covers Remotion Studio, which loads every
// registered composition and so needs every bundle's media present.
const {values, positionals} = parseCli({
  usage: 'npm run sync:media -- [<slug>] [--all]',
  options: {...CONTENT_OPTIONS},
});

let targets;
try {
  targets = await selectTargets(values, positionals, tools);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

for (const target of targets) {
  if (target.layout !== 'bundle') continue;
  const {linked, removed, unchanged} = await syncContentMedia(target.slug);
  console.log(
    `SYNCED ${target.slug} (${linked} linked, ${unchanged} unchanged, ${removed} removed)`,
  );
}
