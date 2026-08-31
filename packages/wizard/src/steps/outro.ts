import { join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { unmanagedSkills } from '../scaffold/appLock';
import { declaredEnv } from '../scaffold/env';
import { skillsSpec } from '../scaffold/skills';
import { outroArt } from '../art';
import { DISCORD_URL, shellUrl } from '../constants';
import { authNextSteps, productionLines, trialLines } from './authNotes';
import { adminPasswordNote } from './adminSetup';
import type { WizardContext } from '../context';

/** Every env name the app was going to be given, for a .env that has to be made by hand. */
const envNames = (ctx: WizardContext): string =>
  declaredEnv(ctx)
    .map((env) => env.name)
    .join(', ');

export function outro(ctx: WizardContext): void {
  console.log(`\n${outroArt()}\n`);
  const pm = ctx.answers.packageManager;
  const agent = ctx.answers.agent;
  const spec = skillsSpec(ctx);
  const resume = agent?.spec.resumeCommand ?? null;
  // What a CLI that cannot carry the checklist on its command line needs typed
  // once the session is open.
  const invocation = agent?.spec.resumeInvocation;
  const nextSteps =
    ctx.answers.mode === 'embed'
      ? [
          // The footprint is copied but not wired — the agent run IS the next step.
          resume
            ? `  ${resume}   ${pc.dim(`# ${invocation ? `then ${invocation} — ` : ''}the agent wires the modules into your project`)}`
            : `  open ${spec.finishSetupPath}   ${pc.dim('# the wiring checklist for your agent')}`,
        ]
      : [
          `  cd ${ctx.answers.appDir}`,
          // First, because nothing below it runs until this does.
          ctx.answers.installFailed ? `  ${pm} install         ${pc.dim('# the install failed earlier')}` : '',
          `  ${pm} run dev        ${pc.dim(`# open ${shellUrl()}`)}`,
          ctx.answers.deployUrl
            ? `  ${pc.cyan(ctx.answers.deployUrl)}   ${pc.dim('# live now; re-deploy with ' + pm + ' run deploy')}`
            : ctx.answers.deployFailed
              ? `  ${pm} run deploy     ${pc.dim('# the deploy stopped earlier — this picks it back up')}`
              : `  ${pm} run deploy     ${pc.dim('# put it on Vercel (CLI only, no repo needed)')}`,
          ctx.answers.githubUrl ? `  ${pc.cyan(ctx.answers.githubUrl)}   ${pc.dim('# your code, pushed')}` : '',
          resume
            ? `  ${resume}   ${pc.dim(`# ${invocation ? `then ${invocation} — ` : ''}guided finish with the skills`)}`
            : '',
        ];
  /* The .env that is not there. Declining the gitignore is the one answer that
     cancels the file, and the run went on to describe it anyway — the person
     was left with a "next steps" list whose very first command cannot work and
     nothing saying why. */
  const envBlock =
    ctx.answers.envWritten === false
      ? [
          '',
          pc.bold('No .env was written:'),
          pc.cyan(`  you declined the .gitignore for it, so the token was never saved to disk`),
          pc.cyan(`  create ${join(ctx.answers.appDir ?? '.', '.env')} yourself, with: ${envNames(ctx)}`),
          pc.dim('  gitignore it first — it holds your token.'),
        ]
      : [];
  /* Skills that were already on disk and stayed at the version they had. The
     run did not replace them, `update` will keep skipping them, and until they
     are named the person has no way to tell an old skill from a new one. */
  const kept = ctx.answers.appDir ? unmanagedSkills(ctx.answers.appDir) : [];
  const keptBlock =
    kept.length > 0
      ? [
          '',
          pc.bold('Left at the version they already had:'),
          ...kept.map((name) => pc.cyan(`  ${name}`)),
          pc.dim('  Not installed by this wizard, so it did not replace them — and neither will `update`.'),
        ]
      : [];
  // The trial first: with no subscription the app runs and answers nothing,
  // which looks like every other kind of broken.
  const trial = trialLines(ctx);
  const trialBlock = trial.length > 0 ? ['', pc.bold('Chatfuel trial:'), ...trial.map((l) => pc.cyan(l))] : [];
  // Auth next: without an owner account nobody can get into the app at all.
  const auth = authNextSteps(ctx);
  const authBlock = auth.length > 0 ? ['', pc.bold('Sign-in (Auth & Team):'), ...auth.map((l) => pc.cyan(l))] : [];
  /* The one secret this run invented that a person has to keep. Printed here
     and written to .env, and to nothing else — the handoff and the agent
     instructions are files that get committed. */
  const admin = adminPasswordNote(ctx);
  const adminBlock = admin
    ? [
        '',
        pc.bold('Admin panel:'),
        ...admin
          .split('\n')
          .slice(1)
          .map((l) => pc.cyan(l)),
      ]
    : [];
  const production = productionLines(ctx);
  const productionBlock = auth.length > 0 && production.length > 0 ? production.map((l) => pc.dim(l)) : [];
  const lines = [
    ctx.answers.app
      ? `${pc.bold('App preset:')} ${ctx.answers.app.manifest.name} ${pc.dim(`(${ctx.answers.app.slug} — the agent gets its build plan)`)}\n`
      : '',
    `${pc.bold('Next steps:')}`,
    ...nextSteps,
    ...envBlock,
    ...keptBlock,
    ...trialBlock,
    ...authBlock,
    ...adminBlock,
    ...productionBlock,
    // A space, not an empty string: the filter below drops anything falsy.
    ' ',
    `${pc.bold('Community:')} ${pc.cyan(pc.underline(DISCORD_URL))}`,
    pc.dim('Rotate the Chatfuel token any time with `npx @chatfuel/wizard auth`.'),
  ].filter(Boolean);
  p.note(lines.join('\n'), 'All set');
  p.outro('Happy shipping!');
}
