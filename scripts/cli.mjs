import {parseArgs} from 'node:util';

// One argument convention for every script in the pipeline:
//
//   <script>                     the whole catalog (what these scripts did before)
//   <script> <slug>              one video, by directory slug or content id
//   <script> --content=<slug>    same, when a positional would be ambiguous
//   <script> --all               the whole catalog, said explicitly
//
// Keeping "no argument" catalog-wide means existing muscle memory and the npm
// scripts that wrap these keep working untouched.
export const CONTENT_OPTIONS = {
  content: {type: 'string', short: 'c'},
  all: {type: 'boolean', default: false},
};

export const parseCli = (config, argv = process.argv.slice(2)) => {
  try {
    return parseArgs({
      args: argv,
      options: config.options ?? {},
      allowPositionals: config.allowPositionals ?? true,
      strict: true,
    });
  } catch (error) {
    console.error(`${error.message}\n\nUsage: ${config.usage}`);
    process.exit(2);
  }
};

export const selectTargets = async (values, positionals, tools) => {
  const argument = values.content ?? positionals[0];
  if (values.all || argument === undefined) return tools.listContentTargets();
  return [await tools.resolveContentTarget(argument)];
};

// Steps that operate on one video still need to know when they were pointed at
// it deliberately: an explicitly requested draft is an error, whereas a draft
// encountered during a catalog sweep is merely skipped.
export const isExplicitTarget = (values, positionals) =>
  !values.all && (values.content ?? positionals[0]) !== undefined;
