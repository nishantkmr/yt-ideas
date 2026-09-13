import {constants} from 'node:fs';
import {copyFile, link, mkdir, readdir, rm, stat, unlink} from 'node:fs/promises';
import {join, relative, sep} from 'node:path';
import {contentRoot, projectRoot, publicRoot, resolveMediaSource} from './content-tools.mjs';

// Remotion's staticFile() is plain string concatenation against the bundle's
// public directory, so anything a composition loads must sit under public/.
// A video's own media is still kept with the rest of that video, in
// content/<slug>/media/, and mirrored into public/content/<slug>/ before a
// render. The mirror is generated and ignored by git; the bundle is the source
// of truth.
//
// Pointing Remotion at a bundle directory instead was rejected because the
// mascot, the music beds and the countdown tick are shared, and each bundle
// would have to carry its own copy. Symlinking was rejected because a Windows
// checkout without symlink support turns them into text files, which Remotion
// would serve as if they were audio.

export const MEDIA_PREFIX = 'content';

/** Public-relative path (what content JSON and staticFile use) for bundle media. */
export const mediaPublicPath = (slug, relativePath) =>
  `${MEDIA_PREFIX}/${slug}/${relativePath}`;

/** Where a bundle's media actually lives in the repository. */
export const mediaSourceRoot = (slug) => join(contentRoot, slug, 'media');

export const mediaMirrorRoot = (slug) => join(publicRoot, MEDIA_PREFIX, slug);

// resolveMediaSource lives in content-tools.mjs so the validator can use it
// without importing this module, which would be a cycle.
export {resolveMediaSource};

const walk = async (root, prefix = '') => {
  const entries = await readdir(root, {withFileTypes: true}).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await walk(join(root, entry.name), relativePath)));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
};

const linkOrCopy = async (from, to) => {
  try {
    // A hard link costs no disk and stays current when a tool rewrites the
    // source in place, which is how the voiceover synthesiser writes cues.
    await link(from, to);
  } catch (error) {
    // Cross-device (EXDEV) and permission-denied (EPERM, common on Windows)
    // both mean links are unavailable here, not that the file is unusable.
    if (!['EXDEV', 'EPERM', 'EACCES'].includes(error?.code)) throw error;
    await copyFile(from, to, constants.COPYFILE_FICLONE);
  }
};

/**
 * Brings public/content/<slug>/ into line with content/<slug>/media/.
 * Returns a summary of what changed.
 */
export const syncContentMedia = async (slug) => {
  const source = mediaSourceRoot(slug);
  const mirror = mediaMirrorRoot(slug);
  const wanted = await walk(source);

  if (wanted.length === 0) {
    await rm(mirror, {recursive: true, force: true});
    return {slug, linked: 0, removed: 0, unchanged: 0};
  }

  let linked = 0;
  let unchanged = 0;
  for (const relativePath of wanted) {
    const from = join(source, relativePath);
    const to = join(mirror, relativePath);
    const [sourceStat, mirrorStat] = await Promise.all([
      stat(from),
      stat(to).catch(() => undefined),
    ]);

    // Same inode means the hard link is still intact. Otherwise compare size and
    // modification time, which catches a tool that replaced the source by
    // writing a temporary file and renaming it over the top.
    if (
      mirrorStat &&
      (mirrorStat.ino === sourceStat.ino ||
        (mirrorStat.size === sourceStat.size && mirrorStat.mtimeMs === sourceStat.mtimeMs))
    ) {
      unchanged += 1;
      continue;
    }

    await mkdir(join(to, '..'), {recursive: true});
    await unlink(to).catch(() => {});
    await linkOrCopy(from, to);
    linked += 1;
  }

  const present = new Set(wanted);
  let removed = 0;
  for (const relativePath of await walk(mirror)) {
    if (present.has(relativePath)) continue;
    await unlink(join(mirror, relativePath));
    removed += 1;
  }

  return {slug, linked, removed, unchanged};
};

export const syncAll = async (targets) => {
  const results = [];
  for (const target of targets) {
    if (target.layout !== 'bundle') continue;
    results.push(await syncContentMedia(target.slug));
  }
  return results;
};

export const relativeToProject = (file) => relative(projectRoot, file).split(sep).join('/');
