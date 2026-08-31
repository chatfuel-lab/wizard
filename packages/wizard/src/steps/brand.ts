import { join } from 'node:path';
import * as p from '@clack/prompts';
import { WizardError } from '../errors';
import { logoProblem, resolveLogoPath, LOGO_EXTENSIONS } from '../scaffold/brandAssets';
import type { WizardContext } from '../context';

/** The name a deployment carries when nobody gives it one. */
export const DEFAULT_APP_NAME = 'Chatfuel App';

/** 1–60 characters on one line — it has to fit a browser tab and a top bar. */
function validateAppName(value: string | undefined): string | undefined {
  const name = (value ?? '').trim();
  if (name.length === 0) return 'The app needs a name';
  if (name.length > 60) return '60 characters at most';
  if (/[\r\n]/.test(name)) return 'One line';
  return undefined;
}

/**
 * The shape of the brand flags, judged before anybody is asked anything —
 * a mistyped `--logo` is answered by the command line, not after a token
 * prompt, a workspace lookup and two minutes of scaffolding.
 *
 * Exported for the tests; `brand` calls it again so the step is safe alone.
 */
export function assertBrandFlags(ctx: WizardContext): void {
  const { appName, logo } = ctx.flags;
  if (appName !== undefined) {
    const problem = validateAppName(appName);
    if (problem) throw new WizardError(`--app-name "${appName.trim()}" is not a name`, problem);
  }
  if (logo !== undefined) {
    const problem = logoProblem(resolveLogoPath(logo));
    if (problem) throw new WizardError(`--logo ${logo} cannot be used`, problem);
  }
}

/**
 * The app's own name and mark.
 *
 * Asked before anything is written, because both end up in files the scaffold
 * step produces: the name in `index.html` and `.env`, the mark in `public/`.
 * Skipping leaves the app named after the workspace it was created from and
 * wearing the mark the template ships — which is a real logo, not a placeholder,
 * so an unanswered run still looks like a finished app.
 *
 * Standalone only: an embedding project already has a head, a `public/` and a
 * mark of its own, and none of the three are the wizard's to overwrite.
 */
export async function brand(ctx: WizardContext): Promise<void> {
  assertBrandFlags(ctx);
  if (ctx.answers.mode !== 'standalone') return;

  // An app preset carries its own name and mark, and the catalog page promised
  // one copy-paste command — so the step is prompt-free. The person's own
  // flags still win: the preset is a default, --app-name/--logo a decision.
  const app = ctx.answers.app;
  if (app) {
    ctx.answers.brand = {
      name: ctx.flags.appName?.trim() || app.manifest.brand.appName,
      logoSource: ctx.flags.logo
        ? resolveLogoPath(ctx.flags.logo)
        : app.manifest.brand.logo
          ? join(app.dir, app.manifest.brand.logo)
          : undefined,
    };
    return;
  }

  const fallback = ctx.flags.appName?.trim() || ctx.answers.workspace?.title.trim() || DEFAULT_APP_NAME;
  if (ctx.flags.yes || ctx.flags.appName) {
    ctx.answers.brand = {
      name: fallback,
      logoSource: ctx.flags.logo ? resolveLogoPath(ctx.flags.logo) : undefined,
    };
    if (!ctx.flags.yes) await askLogo(ctx);
    return;
  }

  const name = await p.text({
    message: 'What is this app called?',
    placeholder: fallback,
    defaultValue: fallback,
    validate: validateAppName,
  });
  if (p.isCancel(name)) throw new WizardError('Cancelled.');
  ctx.answers.brand = {
    name: name.trim(),
    logoSource: ctx.flags.logo ? resolveLogoPath(ctx.flags.logo) : undefined,
  };
  await askLogo(ctx);
}

/**
 * The logo, when the command line did not already carry one. Empty keeps the
 * shipped mark, so the fast path through this step is one Enter.
 */
async function askLogo(ctx: WizardContext): Promise<void> {
  if (ctx.flags.logo) return;
  const answer = await p.text({
    message: `Logo image — a path to a ${LOGO_EXTENSIONS.map((ext) => ext.slice(1)).join('/')} file (Enter to keep the default)`,
    placeholder: './logo.svg',
    defaultValue: '',
    // A wrong path is re-asked here rather than ending the run: the person is
    // at a keyboard with the file in front of them, and this is not the answer
    // to lose twelve steps of progress over.
    validate: (value) => (value?.trim() ? (logoProblem(resolveLogoPath(value)) ?? undefined) : undefined),
  });
  if (p.isCancel(answer)) throw new WizardError('Cancelled.');
  const path = answer.trim();
  if (path) ctx.answers.brand!.logoSource = resolveLogoPath(path);
}
