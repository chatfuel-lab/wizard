import { COUPON_CODE, COUPON_OFFER, DASHBOARD_URL, shellUrl } from '../constants';
import { MIGRATION_TARGET_NAME } from '../supabase/sql';
import type { WizardContext } from '../context';
import { inlineText } from '../inlineText';

/**
 * The auth module's closing words, shared by the outro (terminal) and the
 * handoff (the agent's finish-setup prompt) so the two can never drift.
 *
 * Sign-up is ordinary sign-up, and it ends with the server creating a Chatfuel
 * bot for that account in the picked workspace — so the thing worth saying is
 * where those bots land (and therefore what they bill to), and that the
 * service-role key is what makes any of it work.
 * The rest is honest small print: no SMTP on a fresh project, and production.
 */

const signUpLink = (origin?: string): string =>
  origin ? `${origin.replace(/\/+$/, '')}/sign-up` : shellUrl('sign-up');

const sqlEditorUrl = (projectRef: string | undefined): string =>
  projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql`
    : 'https://supabase.com/dashboard → your project → SQL editor';

/**
 * The workspace left without a plan, for the outro and the handoff. Empty when
 * it has one — a workspace that is paid for has nothing to say here. The line
 * does not promise a trial: the account may have had its one already, in which
 * case the same page sells the plan outright.
 */
export function trialLines(ctx: WizardContext): string[] {
  if (ctx.answers.trialStarted !== false) return [];
  return [
    `Switch the AI on at ${DASHBOARD_URL} — it answers nothing until the workspace has a plan.`,
    `  Enter ${COUPON_CODE} in the promo field — ${COUPON_OFFER}.`,
  ];
}

/** Bullet lines for the outro / handoff. Empty when the auth module is not installed. */
export function authNextSteps(ctx: WizardContext): string[] {
  const auth = ctx.answers.auth;
  if (!auth) return [];
  const lines: string[] = [];

  const workspace = ctx.answers.workspace;
  lines.push(
    `Sign up at ${signUpLink()} — every account that signs up gets a Chatfuel bot of its own`,
    '  and can create more from the Team page,',
    `  created with your master token${workspace ? ` in “${inlineText(workspace.title, 80)}”` : ''}. Colleagues arrive by invite`,
    '  and are given the bots they may open.',
  );
  if (auth.appUrl) lines.push(`  deployed: ${signUpLink(auth.appUrl)}`);

  if (workspace && workspace.botCount >= workspace.botsLimit) {
    lines.push(
      `“${inlineText(workspace.title, 80)}” is full (${workspace.botCount}/${workspace.botsLimit} bots) — sign-ups fail until its`,
      '  Chatfuel plan allows more bots, or a bot is removed from it.',
    );
  } else if (workspace && workspace.botsLimit === 1) {
    lines.push(`“${inlineText(workspace.title, 80)}” holds one bot — only the first account that signs up gets one.`);
  }

  if (!auth.secretKey) {
    lines.push(
      'Add SUPABASE_SERVICE_ROLE_KEY to .env before anybody signs up — without it the server',
      '  cannot create their bot, and sign-up ends on "your workspace is not ready".',
    );
  }

  if (auth.method === 'manual' || !auth.migrationApplied) {
    lines.push(
      `Run the SQL yourself: open ${sqlEditorUrl(auth.projectRef)} and paste every file in`,
      `  supabase/migrations/ in name order, starting with ${MIGRATION_TARGET_NAME}`,
      '  (each one is idempotent, re-run any time).',
    );
  }
  if (auth.method === 'manual' || !auth.authConfigured) {
    lines.push(
      'In Supabase: Authentication → Providers → Email → turn OFF "Confirm email";',
      '  Authentication → URL configuration → add http://localhost:5173/** (and your app origin).',
    );
  }

  lines.push(
    'Password reset emails need custom SMTP (Authentication → SMTP). Until then admins issue a',
    '  "Reset password link" from the row menu on the Team page.',
  );
  return lines;
}

/** Production lines (Vercel, the prod server, Docker) — only meaningful for a standalone scaffold. */
export function productionLines(ctx: WizardContext): string[] {
  if (ctx.answers.mode === 'embed') return [];
  const pm = ctx.answers.packageManager;
  const build = pm === 'npm' ? 'npm run build && npm start' : 'pnpm build && pnpm start';
  return [
    `Production: ${pm} run deploy puts it on Vercel (CLI only, re-runnable, free tier is enough),`,
    `  or self-host with ${build}, or build the included Dockerfile.`,
    '  Either way the server enforces the same auth gate as the dev proxy, and the',
    '  VITE_* values are baked at build time.',
  ];
}

/** Every declared secret env name in the selected closure — the "never print" list. */
export function secretEnvNames(ctx: WizardContext): string[] {
  const names = new Set<string>();
  for (const id of ctx.answers.modules) {
    for (const env of ctx.registry.manifests.get(id)?.app?.env ?? []) {
      if (env.secret) names.add(env.name);
    }
  }
  return [...names];
}
