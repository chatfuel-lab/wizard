import * as p from '@clack/prompts';
import { WizardError } from '../errors';
import { registerSecret } from '../log';
import type { WizardContext } from '../context';
import {
  createManagementClient,
  defaultRegion,
  PAT_HELP_URL,
  projectStatusLabel,
  sortProjects,
  SupabaseManagementError,
  type ManagementClient,
  type Organization,
  type Project,
  type RegionOption,
} from '../supabase/management';
import { projectNameFor } from '../supabase/sql';
import { NON_INTERACTIVE_HINT, validatePat, validateProjectName } from './authSetupFlags';

/**
 * The PAT path's Supabase facts: a Management client whose token is proved to
 * work, and a project that exists and is healthy. Prompts and API calls are
 * mixed here on purpose — each answer decides the next request; the
 * prompt-free client itself lives in ../supabase/management.
 */

export interface AuthSetupDeps {
  /** Injectable for tests. */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  managementBaseUrl?: string;
  pollMs?: number;
}

const cancelled = () => new WizardError('Cancelled.');

/** The wizard-visible face of a Management API failure. */
export function asWizardError(err: unknown, fallbackHint?: string): WizardError {
  if (err instanceof WizardError) return err;
  if (err instanceof SupabaseManagementError) return new WizardError(err.message, err.hint ?? fallbackHint);
  return new WizardError(err instanceof Error ? err.message : String(err), fallbackHint);
}

/**
 * The organization the new project goes into: the flag, else the only one
 * there is, else a prompt — and, when nothing may be asked, a refusal that
 * names the slugs to choose between.
 */
async function resolveOrg(ctx: WizardContext, orgs: Organization[]): Promise<Organization> {
  if (orgs.length === 0) {
    throw new WizardError(
      'The access token sees no organization',
      'Create one at https://supabase.com/dashboard, or use a token from an account that has one.',
    );
  }
  const wanted = ctx.flags.supabaseOrg?.trim();
  if (wanted) {
    const match = orgs.find((org) => org.slug === wanted);
    if (!match) {
      throw new WizardError(
        `The access token sees no organization "${wanted}"`,
        `It sees: ${orgs.map((org) => org.slug).join(', ')}.`,
      );
    }
    return match;
  }
  if (orgs.length === 1) return orgs[0]!;
  if (ctx.flags.yes) {
    throw new WizardError(
      `The access token sees ${orgs.length} organizations — say which one the project belongs in`,
      `Pass --supabase-org <slug>: ${orgs.map((org) => org.slug).join(', ')}.`,
    );
  }
  const answer = await p.select({
    message: 'In which organization?',
    options: orgs.map((o) => ({ value: o.slug, label: o.name, hint: o.slug })),
  });
  if (p.isCancel(answer)) throw cancelled();
  return orgs.find((o) => o.slug === answer)!;
}

/** The region for the new project: the flag, else a prompt, else the recommended one. */
async function resolveRegion(ctx: WizardContext, client: ManagementClient, orgSlug: string): Promise<RegionOption> {
  const spinner = p.spinner();
  spinner.start('Loading available regions…');
  let regions: RegionOption[];
  try {
    regions = await client.availableRegions(orgSlug);
    spinner.stop(`${regions.length} region option(s)`);
  } catch (err) {
    spinner.stop('Could not load regions');
    throw asWizardError(err);
  }
  if (regions.length === 0) throw new WizardError('Supabase returned no regions for this organization');

  const wanted = ctx.flags.supabaseRegion?.trim();
  if (wanted) {
    // A smart group and a single region can carry the same code. The group is
    // the one the picker recommends — Supabase places the project inside it —
    // so it wins the tie.
    const match =
      regions.find((r) => r.code === wanted && r.type === 'smartGroup') ?? regions.find((r) => r.code === wanted);
    if (!match) {
      throw new WizardError(
        `Supabase offers no region "${wanted}" to this organization`,
        `It offers: ${regions.map((r) => r.code).join(', ')}.`,
      );
    }
    return match;
  }

  const preselect = defaultRegion(regions)!;
  if (ctx.flags.yes) return preselect;
  const regionCode = await p.select({
    message: 'Region:',
    options: regions.map((r) => ({
      value: `${r.type}:${r.code}`,
      label: r.name,
      hint: r.type === 'smartGroup' ? `smart group${r.recommended ? ' — recommended' : ''}` : r.code,
    })),
    initialValue: `${preselect.type}:${preselect.code}`,
  });
  if (p.isCancel(regionCode)) throw cancelled();
  return regions.find((r) => `${r.type}:${r.code}` === regionCode)!;
}

/** The name for a project created from the picker — the flag path brings its own. */
async function askProjectName(ctx: WizardContext): Promise<string> {
  const workspace = ctx.answers.workspace;
  const defaultName = projectNameFor(workspace?.title, workspace?.id ?? 'auth');
  const name = await p.text({
    message: 'Project name:',
    defaultValue: defaultName,
    placeholder: defaultName,
    validate: validateProjectName,
  });
  if (p.isCancel(name)) throw cancelled();
  return name.trim();
}

/**
 * Which project the run will use, and whether the run is the reason it exists.
 *
 * `created` is not bookkeeping: the auth config step asserts the sign-in
 * settings on a project the wizard made and refuses to lower them on anybody
 * else's (see desiredAuthPatch). `project` is undefined only under --dry-run,
 * where the creation never happened.
 */
export interface ProjectChoice {
  project?: Project;
  created: boolean;
}

export async function pickOrCreateProject(
  ctx: WizardContext,
  client: ManagementClient,
  orgs: Organization[],
): Promise<ProjectChoice> {
  const wait = async (ref: string, verb: string): Promise<Project> => {
    const spinner = p.spinner();
    spinner.start(`${verb} project ${ref}…`);
    try {
      const project = await client.waitForProject(ref, {
        onStatus: (status) => spinner.message(`${verb} project ${ref}… (${projectStatusLabel(status)})`),
      });
      spinner.message(`Waiting for auth, db and rest to be healthy…`);
      await client.waitForHealth(ref, ['auth', 'db', 'rest'], {
        onStatus: (status) => spinner.message(`Waiting for services… (${status})`),
      });
      spinner.stop(`Project ${project.name} (${ref}) is healthy`);
      return project;
    } catch (err) {
      spinner.stop(`Project ${ref} is not ready`);
      throw asWizardError(err);
    }
  };

  const ensureReady = async (project: Project): Promise<Project> => {
    if (project.status === 'ACTIVE_HEALTHY') return project;
    if (project.status === 'INACTIVE') {
      throw new WizardError(
        `Project ${project.name} (${project.ref}) is paused`,
        `Restore it at https://supabase.com/dashboard/project/${project.ref} and re-run, or pick another project.`,
      );
    }
    return wait(project.ref, 'Waiting for');
  };

  if (ctx.flags.supabaseProject) {
    const ref = ctx.flags.supabaseProject.trim();
    const spinner = p.spinner();
    spinner.start(`Looking up project ${ref}…`);
    let project: Project;
    try {
      project = await client.getProject(ref);
      spinner.stop(`Project: ${project.name} (${ref}, ${project.region}, ${projectStatusLabel(project.status)})`);
    } catch (err) {
      spinner.stop(`Project ${ref} not found`);
      throw asWizardError(err, 'Check --supabase-project <ref> (the 20-letter id in the dashboard URL).');
    }
    return { project: await ensureReady(project), created: false };
  }

  const listAll = async (): Promise<Project[]> => {
    const listing = p.spinner();
    listing.start('Listing your Supabase projects…');
    try {
      const projects = sortProjects(await client.listProjects());
      listing.stop(projects.length === 0 ? 'No projects yet' : `${projects.length} project(s) found`);
      return projects;
    } catch (err) {
      listing.stop('Could not list projects');
      throw asWizardError(err);
    }
  };

  /** Organization, name and region — flags where given, prompts otherwise — then create and wait. */
  const create = async (name?: string): Promise<ProjectChoice> => {
    const org = await resolveOrg(ctx, orgs);
    const projectName = name ?? (await askProjectName(ctx));
    const region = await resolveRegion(ctx, client, org.slug);

    if (ctx.flags.dryRun) {
      p.log.info(
        `--dry-run: would POST /v1/projects {name: "${projectName}", organization_slug: "${org.slug}", region_selection: ${region.type}/${region.code}} and wait for it. Nothing is created — re-run without --dry-run to create the project.`,
      );
      return { project: undefined, created: true };
    }

    const creating = p.spinner();
    creating.start(`Creating project ${projectName} in ${region.name}…`);
    let created: Project;
    try {
      created = await client.createProject({ name: projectName, organizationSlug: org.slug, region });
      creating.stop(`Project ${created.name} created (${created.ref})`);
    } catch (err) {
      creating.stop('Project creation failed');
      throw asWizardError(
        err,
        'Free plans allow two active projects — pause or delete one, or pick an existing project.',
      );
    }
    return { project: await wait(created.ref, 'Provisioning'), created: true };
  };

  // --supabase-create: how a run that never prompts gets a project. The name
  // is the identity — a project already carrying it is the one the last run
  // made, and reusing it is what keeps a repeated script from spending the
  // account's second free project on a duplicate.
  if (ctx.flags.supabaseCreate) {
    const name = ctx.flags.supabaseCreate.trim();
    const org = ctx.flags.supabaseOrg?.trim();
    const existing = (await listAll()).filter(
      (project) => project.name === name && (!org || project.organizationSlug === org),
    );
    if (existing.length > 1) {
      throw new WizardError(
        `${existing.length} Supabase projects are called "${name}"`,
        `Say which one with --supabase-project <ref>: ${existing.map((project) => project.ref).join(', ')}.`,
      );
    }
    if (existing[0]) {
      p.log.info(`Project ${existing[0].name} (${existing[0].ref}) already exists — using it.`);
      return { project: await ensureReady(existing[0]), created: false };
    }
    return create(name);
  }

  const projects = await listAll();
  const CREATE = '__create__';
  const options = [
    ...projects.map((project) => ({
      value: project.ref,
      label: project.name,
      hint: `${project.ref} · ${project.region} · ${projectStatusLabel(project.status)}`,
    })),
    {
      value: CREATE,
      label: 'Create a new project',
      hint: 'about two minutes; the free plan allows two active projects',
    },
  ];
  const picked = await p.select({
    message: 'Which Supabase project should hold the users of this app?',
    options,
    initialValue: options[0]!.value,
  });
  if (p.isCancel(picked)) throw cancelled();
  if (picked !== CREATE) {
    return { project: await ensureReady(projects.find((project) => project.ref === picked)!), created: false };
  }

  // Unreachable in a --yes run — it never reaches the picker — but the promise
  // that nothing is created behind the user's back is worth a backstop.
  if (ctx.flags.yes)
    throw new WizardError('Refusing to create a Supabase project non-interactively', NON_INTERACTIVE_HINT);

  return create();
}

/** How many times a rejected token may be retyped before the run gives up. */
const PAT_ATTEMPTS = 3;

/**
 * The access token, from the flag / environment on the first try and from the
 * keyboard after that.
 *
 * Asking at all is the point: picking "Personal access token" in the prompt
 * used to reach the API with nothing at all, because the value was only ever
 * whatever `--supabase-token` / SUPABASE_ACCESS_TOKEN had resolved to. A
 * retype must not reuse the value that was just rejected either, so attempt 2
 * onwards always prompts.
 */
async function askPat(ctx: WizardContext, attempt: number): Promise<string> {
  const known = ctx.secrets.supabaseToken?.trim();
  if (attempt === 1 && known) return known;
  if (ctx.flags.yes) throw new WizardError('The auth module needs a Supabase access token', NON_INTERACTIVE_HINT);
  const entered = await p.password({
    message: `Paste your Supabase access token (${PAT_HELP_URL}):`,
    validate: validatePat,
  });
  if (p.isCancel(entered)) throw cancelled();
  return entered.trim();
}

/**
 * A Management API client whose token has been proved to work, plus the
 * organizations it can see.
 *
 * A rejected token is a typo, not the end of the run: everything answered so
 * far — modules, the Chatfuel token, the workspace — would be lost with it.
 */
export async function verifiedClient(
  ctx: WizardContext,
  deps: AuthSetupDeps,
): Promise<{ client: ManagementClient; orgs: Organization[] }> {
  for (let attempt = 1; ; attempt += 1) {
    const pat = await askPat(ctx, attempt);
    registerSecret(pat);
    const client = createManagementClient({
      token: pat,
      fetch: deps.fetch,
      sleep: deps.sleep,
      baseUrl: deps.managementBaseUrl,
      pollMs: deps.pollMs,
    });
    const check = p.spinner();
    check.start('Checking the Supabase access token…');
    try {
      const orgs = await client.listOrganizations();
      check.stop(`Access token OK — ${orgs.length} organization${orgs.length === 1 ? '' : 's'}`);
      // The deploy step reads it back from here to add the app's URL to the
      // Supabase redirect allowlist once the URL exists.
      ctx.secrets.supabaseToken = pat;
      return { client, orgs };
    } catch (err) {
      check.stop('Access token check failed');
      const wrapped = asWizardError(err);
      const rejected = err instanceof SupabaseManagementError && (err.status === 401 || err.status === 403);
      if (!rejected || attempt >= PAT_ATTEMPTS || ctx.flags.yes) throw wrapped;
      // The hint is the sentence that tells somebody what to do; the raw
      // "GET /v1/organizations → 401" line is for the log, not for them.
      p.log.warn('Supabase rejected that access token.');
      if (wrapped.hint) p.log.info(wrapped.hint);
    }
  }
}
