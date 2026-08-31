import * as p from '@clack/prompts';
import { WorkspacesListDocument, type WorkspacesListQuery } from '@chatfuel/api-client/generated/core';
import { hasErrorCode } from '@chatfuel/api-client';
import { stepArt } from '../art';
import { WorkspaceCreateDocument } from '../billing';
import { DASHBOARD_URL } from '../constants';
import { ApiWizardError, WizardError } from '../errors';
import type { WizardContext } from '../context';

type WorkspaceNode = NonNullable<WorkspacesListQuery['currentUser']>['workspaces'][number];

/**
 * Which Chatfuel workspace this deployment starts in.
 *
 * A workspace is Chatfuel's BILLING container: someone pays for one, and every
 * bot inside it draws on that payment. It is also the level people think in —
 * an account holds workspaces, a workspace holds bots — so it is the only thing
 * asked for here. Bots are never picked: the app lists them itself, and one
 * created tomorrow is usable tomorrow, without a re-run. An account that owns
 * no workspace at all gets one made here — that is a brand-new customer, and
 * sending them away to make it by hand is sending them away.
 *
 * The choice means two different things depending on the auth module:
 *
 * - with it, the app has no bot of its own. Every account that signs up gets
 *   one, created by the server in THIS workspace, so the choice decides who
 *   pays. The limit is worth saying out loud, because it is now shared two
 *   ways: a workspace holds `botsLimit` bots, and every account's first bot AND
 *   every extra one anybody adds later comes out of that same allowance. When
 *   it is full, the next sign-up fails. Nothing here can raise it — that is a
 *   plan change in the Chatfuel dashboard.
 * - without it, the app works the account's bots directly and this is simply
 *   the workspace it opens on. Every other workspace of the account is one
 *   click away in the app, so a wrong answer here costs a click.
 */
export async function workspacePick(ctx: WizardContext): Promise<void> {
  if (!ctx.client) throw new WizardError('internal: workspacePick before token step');
  const selfServe = ctx.answers.modules.includes('auth');
  p.log.message(stepArt('workspace'));

  const spinner = p.spinner();
  spinner.start('Loading your Chatfuel workspaces…');
  let workspaces: WorkspaceNode[];
  try {
    const data = await ctx.client.query(WorkspacesListDocument, {});
    workspaces = [...(data.currentUser?.workspaces ?? [])];
    spinner.stop(`${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'} found`);
  } catch (err) {
    spinner.stop('Could not list workspaces');
    throw new WizardError(
      err instanceof Error ? err.message : String(err),
      selfServe
        ? 'The token must belong to the account that owns the workspace the bots should be billed to.'
        : 'The token must belong to the account that owns the bots the app will work with.',
    );
  }

  // A brand-new account owns nothing yet. Making the workspace here is the
  // whole difference between a wizard that a new customer can finish and one
  // that sends them to the dashboard and asks them to start over.
  if (workspaces.length === 0) {
    /* `--dry-run` promises the account is left as it was, and creating the
       workspace is the one thing in this step that would not be. The rest of
       the run needs something to carry, so it carries a stand-in that exists
       nowhere else — the steps that would spend it are dry-run guarded too. */
    if (ctx.flags.dryRun) {
      p.log.info('--dry-run: would create your first Chatfuel workspace.');
      workspaces = [
        { id: 'dry-run-workspace', title: 'Your first workspace', botsLimit: 1, bots: [] } as unknown as WorkspaceNode,
      ];
    } else {
      const creating = p.spinner();
      creating.start('Creating your first Chatfuel workspace…');
      try {
        const created = await ctx.client.mutate(WorkspaceCreateDocument, {});
        // Its bot list is not read back — see WorkspaceCreateDocument — and a
        // workspace made a second ago holds nothing anyway.
        workspaces = [{ ...created.workspaceCreate, bots: [] }];
        creating.stop(`Created ${created.workspaceCreate.title}`);
      } catch (err) {
        creating.stop('Could not create a workspace');
        throw new ApiWizardError(
          hasErrorCode(err, 'TooManyWorkspaces')
            ? 'This Chatfuel account is at its workspace limit'
            : 'Could not create a Chatfuel workspace',
          err,
          `Create one at ${DASHBOARD_URL} — that is where the plan is paid — then re-run.`,
        );
      }
    }
  }

  const room = (w: WorkspaceNode) => w.botsLimit - w.bots.length;
  const label = (w: WorkspaceNode) => `${w.bots.length}/${w.botsLimit} bots`;

  let picked: WorkspaceNode;
  if (ctx.flags.workspace) {
    const id = ctx.flags.workspace.trim();
    const match = workspaces.find((w) => w.id === id);
    if (!match) {
      throw new WizardError(
        `--workspace ${id} is not a workspace of this account`,
        `Known ids: ${workspaces.map((w) => `${w.id} (${w.title})`).join(', ')}`,
      );
    }
    picked = match;
    p.log.info(`Using the workspace from --workspace: ${picked.title}`);
  } else if (workspaces.length === 1) {
    picked = workspaces[0]!;
    p.log.info(`Using the only workspace on the account: ${picked.title} (${label(picked)})`);
  } else if (ctx.flags.yes) {
    // Which workspace pays is not a question to answer on somebody's behalf;
    // which one opens first is, and the app can change it in a click.
    if (selfServe) {
      throw new WizardError(
        'The auth module needs a Chatfuel workspace in non-interactive mode',
        `Pass --workspace <id>. This account has: ${workspaces.map((w) => `${w.id} (${w.title}, ${label(w)})`).join(', ')}`,
      );
    }
    picked = workspaces.find((w) => w.bots.length > 0) ?? workspaces[0]!;
    p.log.info(`Opening on ${picked.title} (${label(picked)}) — pass --workspace <id> to choose another.`);
  } else {
    const ordered = selfServe
      ? // A full workspace cannot take a single sign-up, so put the ones with room first.
        [...workspaces].sort((a, b) => (room(b) > 0 ? 1 : 0) - (room(a) > 0 ? 1 : 0) || a.title.localeCompare(b.title))
      : [...workspaces].sort((a, b) => a.title.localeCompare(b.title));
    const options = ordered.map((w) => ({ value: w.id, label: w.title, hint: `${label(w)} · ${w.id}` }));
    const answer = await p.select({
      message: selfServe
        ? 'Which Chatfuel workspace should the accounts’ bots be created in?'
        : 'Which Chatfuel workspace should the app open?',
      options,
      initialValue: options[0]!.value,
    });
    if (p.isCancel(answer)) throw new WizardError('Cancelled.');
    picked = workspaces.find((w) => w.id === answer)!;
  }

  if (selfServe) {
    if (room(picked) <= 0) {
      p.log.warn(
        `${picked.title} is full (${label(picked)}) — sign-ups will fail until its plan allows more bots or a bot is removed.`,
      );
    } else {
      p.log.info(
        `${picked.title} has room for ${room(picked)} more bot${room(picked) === 1 ? '' : 's'} (${label(picked)}). Every account's first bot, and every extra one they add, comes out of that.`,
      );
      if (picked.botsLimit === 1) {
        p.log.warn(`${picked.title} holds one bot in total — only the first account that signs up gets one.`);
      }
    }
  } else if (picked.bots.length === 0) {
    p.log.warn(`${picked.title} holds no bots yet — create one at ${DASHBOARD_URL} and the app will pick it up.`);
  }

  ctx.answers.workspace = {
    id: picked.id,
    title: picked.title,
    botsLimit: picked.botsLimit,
    botCount: picked.bots.length,
  };
  // Two names for two jobs: the server creates bots in one workspace, the
  // browser opens on one. They are the same id here, and need not stay so.
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = picked.id;
  if (selfServe) ctx.answers.env.CHATFUEL_WORKSPACE_ID = picked.id;
}
