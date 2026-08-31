import * as p from '@clack/prompts';
import { stepArt } from '../art';
import { checklist } from '../prompts/checklist';
import { WizardError } from '../errors';
import type { WizardContext } from '../context';

export async function selectModules(ctx: WizardContext): Promise<void> {
  p.log.message(stepArt('modules'));
  const ready = ctx.registry.ready().filter((m) => m.id !== 'core');
  if (ready.length === 0) {
    throw new WizardError('No modules are marked ready in this build.');
  }

  // One gate for every non-interactive origin of a module list — the flag and
  // the app preset refuse for identical reasons, naming their own source.
  const assertSelectable = (ids: string[], subject: (id: string) => string): void => {
    const readyList = `Ready modules: ${ready.map((m) => m.id).join(', ')}`;
    for (const id of ids) {
      const manifest = ctx.registry.manifests.get(id);
      if (!manifest) throw new WizardError(`${subject(id)} unknown module "${id}"`, readyList);
      if (manifest.status !== 'ready') {
        throw new WizardError(`${subject(id)} module "${id}", which is not ready in this build`, readyList);
      }
    }
  };

  let selected: string[];
  if (ctx.answers.app) {
    const app = ctx.answers.app;
    selected = app.manifest.modules;
    assertSelectable(selected, () => `App "${app.slug}" wants`);
    p.log.info(`App "${app.manifest.name}": installing ${selected.join(', ')}.`);
  } else if (ctx.flags.modules) {
    selected = ctx.flags.modules
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    assertSelectable(selected, () => `--modules names`);
    if (selected.length === 0) throw new WizardError('--modules was given but empty.');
  } else if (ctx.flags.yes) {
    // Non-interactive default: everything ready EXCEPT opt-in modules (auth
    // needs a Supabase project) — name them explicitly with --modules.
    selected = ready.filter((m) => m.selection !== 'opt-in').map((m) => m.id);
    const optIn = ready.filter((m) => m.selection === 'opt-in').map((m) => m.id);
    p.log.info(
      `--yes: installing every ready module (${selected.join(', ')}); use --modules a,b to narrow${optIn.length > 0 ? `; opt-in modules (${optIn.join(', ')}) only with --modules` : ''}.`,
    );
  } else if (ready.length === 1) {
    const only = ready[0]!;
    p.log.info(`One module available in this build: ${only.name} — ${only.description}`);
    selected = [only.id];
  } else {
    const picked = await checklist({
      message: 'Which modules do you want?',
      options: ready.map((m) => ({
        value: m.id,
        label: m.name,
        hint: m.selection === 'opt-in' ? `(opt-in — needs a Supabase project) ${m.description}` : m.description,
      })),
      required: true,
    });
    if (picked === null) throw new WizardError('Cancelled.');
    selected = picked;
  }

  let closure = ctx.registry.closure(selected);
  const added = closure.filter((id) => id !== 'core' && !selected.includes(id));
  if (added.length > 0) {
    p.log.info(`Also installing (required): ${added.join(', ')}`);
  }

  // Recommendations: ready modules the selection recommends but doesn't include.
  const recommended = [
    ...new Set(
      closure
        .flatMap((id) => ctx.registry.manifests.get(id)?.recommends ?? [])
        .filter((id) => !closure.includes(id))
        .filter((id) => ctx.registry.manifests.get(id)?.status === 'ready'),
    ),
  ];
  if (recommended.length > 0) {
    // Non-interactive origins (flags, --yes, an app preset) are told, not asked.
    if (ctx.flags.yes || ctx.flags.modules || ctx.answers.app) {
      p.log.info(`Recommended with your selection (not installed): ${recommended.join(', ')}`);
    } else {
      const extra = await checklist({
        message: 'Recommended with your selection — add any?',
        options: recommended.map((id) => {
          const m = ctx.registry.manifests.get(id)!;
          return { value: id, label: m.name, hint: m.description };
        }),
        required: false,
      });
      if (extra === null) throw new WizardError('Cancelled.');
      if (extra.length > 0) closure = ctx.registry.closure([...selected, ...extra]);
    }
  }

  ctx.answers.modules = closure;
}
