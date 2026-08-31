import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { resolveFromUserCwd } from '../cwd';
import { WizardError } from '../errors';
import { applyBrandHtml, FAVICON_TYPES } from './transforms';
import type { WizardContext } from '../context';

/** The mark `content/shell/public/` ships, and the name every copied one takes. */
export const DEFAULT_LOGO_FILE = 'logo.svg';

/**
 * What a browser will draw as both a tab icon and an inline mark. No PDF, no
 * TIFF, nothing that needs converting: the file is copied byte for byte and
 * whatever it is has to work in an `<img>` and in a `<link rel="icon">`.
 */
export const LOGO_EXTENSIONS = Object.keys(FAVICON_TYPES);

/**
 * A logo is chrome, on every screen, and it is inlined into the page's critical
 * path. A megabyte is already generous for that; past it the file is a photo,
 * and the person meant to pick something else.
 */
export const MAX_LOGO_BYTES = 1024 * 1024;

/**
 * Why this path cannot be the app's logo, or null when it can. One function so
 * that `--logo` and the prompt refuse for identical reasons — a flag that
 * accepts what the prompt rejects is how a non-interactive run ships something
 * a person would have caught.
 */
export function logoProblem(path: string): string | null {
  if (!existsSync(path)) return `${path} does not exist`;
  const stat = statSync(path);
  if (!stat.isFile()) return `${path} is not a file`;
  const ext = extname(path).toLowerCase();
  if (!LOGO_EXTENSIONS.includes(ext)) {
    return `${ext || 'that'} is not an image a browser can draw — use ${LOGO_EXTENSIONS.join(', ')}`;
  }
  if (stat.size > MAX_LOGO_BYTES) {
    return `${path} is ${Math.round(stat.size / 1024)} KB — keep a logo under ${MAX_LOGO_BYTES / 1024} KB`;
  }
  return null;
}

/** Resolve a user-typed path the same way the target directory is resolved. */
export const resolveLogoPath = (input: string): string => resolveFromUserCwd(input.trim());

/**
 * Copy the chosen logo into `<dir>/public/` and return the name it now has
 * there. The shipped default is removed when the new file is not an SVG: an
 * app has exactly one mark, and leaving two behind means the next person to
 * look cannot tell which one is live.
 */
function copyLogo(logoSource: string, publicDir: string): string {
  const ext = extname(logoSource).toLowerCase();
  const file = `logo${ext}`;
  mkdirSync(publicDir, { recursive: true });
  cpSync(logoSource, join(publicDir, file));
  if (file !== DEFAULT_LOGO_FILE) rmSync(join(publicDir, DEFAULT_LOGO_FILE), { force: true });
  return file;
}

/**
 * Put the mark in `public/`, write the name and the icon into `index.html`,
 * and record both as env for `.env`.
 *
 * Runs before `writeEnv` — `answers.env` is what that file is built from.
 *
 * Standalone only, and deliberately: in embed mode the surrounding project owns
 * its `<head>`, its `public/`, and whatever mark is already in both. Overwriting
 * any of that is not the wizard's call. An embedding host names the sign-in
 * screen through `VITE_APP_NAME` and passes its own mark to `AuthGate`.
 */
export function applyBrand(ctx: WizardContext, target: string): void {
  const brand = ctx.answers.brand;
  if (!brand) throw new WizardError('internal: the brand step did not run');

  if (brand.logoSource) brand.logoFile = copyLogo(brand.logoSource, join(target, 'public'));
  const logoFile = brand.logoFile ?? DEFAULT_LOGO_FILE;

  ctx.answers.env.VITE_APP_NAME = brand.name;
  ctx.answers.env.VITE_APP_LOGO = logoFile;

  applyBrandHtml(join(target, 'index.html'), {
    title: brand.name,
    // Not "/logo.svg": the app can be mounted under a sub-path, and this is the
    // one reference resolved at build time rather than by the app at runtime.
    href: `%BASE_URL%${logoFile}`,
    type: FAVICON_TYPES[extname(logoFile).toLowerCase()]!,
  });
}
