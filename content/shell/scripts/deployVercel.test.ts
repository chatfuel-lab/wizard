import { existsSync, readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
// The exports below are the script's tested surface.
import {
  DEPLOY_ENV,
  checkEnv,
  childEnv,
  deployHosts,
  describeProxy,
  hostsInOutput,
  listProjectNames,
  looksLikeNetworkFailure,
  makeRunner,
  makeStreamRunner,
  maskValue,
  networkFailureLines,
  parseAliases,
  parseDeployUrl,
  parseEnvFile,
  parseProjectNames,
  projectNameArg,
  projectSlug,
  selectEnv,
  stepCli,
  targetsFor,
  undeployedProxyVars,
} from './deploy-vercel.mjs';

/**
 * The parts of `npm run deploy` that decide WHAT gets pushed. The steps that
 * shell out to the Vercel CLI are not testable without a Vercel account; these
 * are, and they are where a wrong answer is expensive: a secret pushed as
 * readable, an empty value pushed as if it were set, a project name Vercel
 * rejects after the build already ran.
 */

describe('parseEnvFile', () => {
  it('reads plain, exported and quoted values', () => {
    const values = parseEnvFile(
      [
        'CHATFUEL_TOKEN=abc123',
        'export CHATFUEL_API_BASE=https://panel.chatfuel.com',
        'VITE_APP_NAME="My app"',
        "X='y'",
      ].join('\n'),
    );
    expect(values.get('CHATFUEL_TOKEN')).toBe('abc123');
    expect(values.get('CHATFUEL_API_BASE')).toBe('https://panel.chatfuel.com');
    expect(values.get('VITE_APP_NAME')).toBe('My app');
    expect(values.get('X')).toBe('y');
  });

  it('treats a commented placeholder as absent, not as an empty value', () => {
    // The wizard writes `# NAME=` for a variable it has nothing to fill.
    // Reading it back as '' would push a set-but-empty variable, which every
    // reader downstream treats as configured.
    const values = parseEnvFile('# SUPABASE_PROJECT_REF=\nCHATFUEL_TOKEN=t\n');
    expect(values.has('SUPABASE_PROJECT_REF')).toBe(false);
  });

  it('drops empty assignments and junk lines', () => {
    const values = parseEnvFile('EMPTY=\n   \nnot a var\nOK=1\n');
    expect([...values.keys()]).toEqual(['OK']);
  });
});

describe('checkEnv', () => {
  it('refuses a .env with no Chatfuel token', () => {
    const { errors } = checkEnv(parseEnvFile(''));
    expect(errors.join(' ')).toContain('CHATFUEL_TOKEN');
  });

  it('refuses half a Supabase pair — the proxy would fail closed on every request', () => {
    const { errors } = checkEnv(parseEnvFile('CHATFUEL_TOKEN=t\nVITE_SUPABASE_URL=https://x.supabase.co\n'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('together');
  });

  it('requires the service-role key and the workspace once the gate is on', () => {
    const { errors } = checkEnv(
      parseEnvFile('CHATFUEL_TOKEN=t\nVITE_SUPABASE_URL=https://x.supabase.co\nVITE_SUPABASE_ANON_KEY=k\n'),
    );
    expect(errors.join(' ')).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(errors.join(' ')).toContain('CHATFUEL_WORKSPACE_ID');
  });

  it('passes a complete auth deployment', () => {
    const { errors } = checkEnv(
      parseEnvFile(
        [
          'CHATFUEL_TOKEN=t',
          'VITE_SUPABASE_URL=https://x.supabase.co',
          'VITE_SUPABASE_ANON_KEY=k',
          'SUPABASE_SERVICE_ROLE_KEY=s',
          'CHATFUEL_WORKSPACE_ID=w',
        ].join('\n'),
      ),
    );
    expect(errors).toEqual([]);
  });

  it('refuses a deployment with no auth gate unless the open proxy is asked for by name', () => {
    const { errors } = checkEnv(parseEnvFile('CHATFUEL_TOKEN=t\n'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('CHATFUEL_OPEN_PROXY=1');
    // Only the exact value answers; anything else is a variable set by accident.
    expect(checkEnv(parseEnvFile('CHATFUEL_TOKEN=t\nCHATFUEL_OPEN_PROXY=true\n')).errors).toHaveLength(1);
  });

  it('warns, but does not refuse, a deployment with no starting workspace', () => {
    const { errors, warnings } = checkEnv(parseEnvFile('CHATFUEL_TOKEN=t\nCHATFUEL_OPEN_PROXY=1\n'));
    expect(errors).toEqual([]);
    expect(warnings.join(' ')).toContain('VITE_CHATFUEL_WORKSPACE_ID');
  });
});

describe('selectEnv', () => {
  it('pushes only known variables, and never the wizard-only ones', () => {
    const values = parseEnvFile(
      [
        'CHATFUEL_TOKEN=t',
        'SUPABASE_ACCESS_TOKEN=pat',
        'SUPABASE_PROJECT_REF=ref',
        'PORT=3000',
        'VITE_APP_NAME=App',
      ].join('\n'),
    );
    expect(selectEnv(values).map((e: { name: string }) => e.name)).toEqual(['CHATFUEL_TOKEN', 'VITE_APP_NAME']);
  });

  it('marks the two credentials secret and nothing else', () => {
    const values = parseEnvFile(
      ['CHATFUEL_TOKEN=t', 'SUPABASE_SERVICE_ROLE_KEY=s', 'VITE_SUPABASE_ANON_KEY=k', 'CHATFUEL_WORKSPACE_ID=w'].join(
        '\n',
      ),
    );
    const secret = selectEnv(values)
      .filter((e: { secret: boolean }) => e.secret)
      .map((e: { name: string }) => e.name);
    expect(secret).toEqual(['CHATFUEL_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY']);
  });
});

describe('targetsFor', () => {
  it('pushes to production and nothing else by default', () => {
    expect(targetsFor({})).toEqual(['production']);
  });

  it('adds preview only on the explicit opt-in', () => {
    expect(targetsFor({ DEPLOY_PREVIEW_ENV: '1' })).toEqual(['production', 'preview']);
  });

  it('treats anything other than 1 as no', () => {
    for (const value of ['0', 'true', 'yes', '']) {
      expect(targetsFor({ DEPLOY_PREVIEW_ENV: value })).toEqual(['production']);
    }
  });
});

describe('projectSlug', () => {
  it('lowercases, replaces what Vercel will not take, and trims the edges', () => {
    expect(projectSlug('My Chatfuel App')).toBe('my-chatfuel-app');
    expect(projectSlug('@acme/inbox')).toBe('inbox');
    expect(projectSlug('-weird--name-')).toBe('weird--name');
  });

  it('falls back rather than sending Vercel an empty name', () => {
    expect(projectSlug('---')).toBe('chatfuel-app');
    expect(projectSlug(undefined)).toBe('chatfuel-app');
  });

  it('stays inside Vercel’s 100-character limit', () => {
    expect(projectSlug('a'.repeat(200))).toHaveLength(100);
  });
});

describe('maskValue', () => {
  it('never shows any part of a secret, nor how long it is', () => {
    expect(maskValue('supersecrettoken', true)).not.toContain('super');
    expect(maskValue('supersecrettoken', true)).not.toMatch(/\d/);
    // A chosen password's length narrows an offline search, so the two lengths
    // print the same thing.
    expect(maskValue('supersecrettoken', true)).toBe(maskValue('short-one', true));
  });

  it('shows a non-secret in full — a bot id nobody can read is a debugging tax', () => {
    expect(maskValue('bot-1', false)).toBe('bot-1');
  });
});

describe('parseAliases', () => {
  const inspectOutput = [
    'Vercel CLI 59.1.4 (Node.js 22.22.0)',
    'Fetching deployment "app-abc-team.vercel.app" in team',
    '  Aliases',
    '    ╶ https://app-orpin.vercel.app',
    '    ╶ https://app-team.vercel.app',
    '  Builds',
  ].join('\n');

  it('collects the aliases and drops the CLI’s own chrome', () => {
    // Shortest first: the production domain is normally the short one, and the
    // reachability probe decides anyway — this only sets the order it asks in.
    expect(parseAliases(inspectOutput)).toEqual(['https://app-team.vercel.app', 'https://app-orpin.vercel.app']);
  });

  it('never offers a vercel.com link as a deployment', () => {
    expect(parseAliases('see https://vercel.com/docs and https://app-x.vercel.app')).toEqual([
      'https://app-x.vercel.app',
    ]);
  });

  it('keeps a custom domain', () => {
    expect(parseAliases('╶ https://app.example.com')).toContain('https://app.example.com');
  });
});

describe('parseDeployUrl', () => {
  // What `vercel deploy --prod --yes` writes to STDERR for a person. Every one
  // of these lines is on stderr, not stdout: a script that captures stdout
  // alone sees an empty string and concludes the deploy printed nothing.
  const humanStderr = [
    'Vercel CLI 59.1.4 (Node.js 22.22.0)',
    '  Inspect         https://vercel.com/acme/app/dpl_xyz',
    '▲ Production      https://app-hash-acme.vercel.app',
    '▲ Aliased         https://app-word.vercel.app',
    '',
    '✓ Ready in 42s',
    '',
  ].join('\n');

  it('reads the URL off stderr when stdout is empty', () => {
    // Aliased over Production: the aliased one is the public production domain,
    // the other is the deployment's own, which Deployment Protection keeps
    // behind an SSO wall by default.
    expect(parseDeployUrl('', humanStderr)).toBe('https://app-word.vercel.app');
  });

  it('reads it through the colour codes', () => {
    const coloured = humanStderr
      .replace('Aliased', '\u001B[1mAliased\u001B[22m')
      .replace('https://app-word.vercel.app', '\u001B[36mhttps://app-word.vercel.app\u001B[39m');
    expect(parseDeployUrl('', `\u001B[2A\u001B[0J${coloured}`)).toBe('https://app-word.vercel.app');
  });

  it('falls back to the deployment URL when nothing was aliased', () => {
    const notAliased = humanStderr
      .split('\n')
      .filter((line) => !line.includes('Aliased'))
      .join('\n');
    expect(parseDeployUrl('', notAliased)).toBe('https://app-hash-acme.vercel.app');
  });

  it('reads a preview deployment', () => {
    expect(parseDeployUrl('', '▲ Preview         https://app-hash-acme.vercel.app\n')).toBe(
      'https://app-hash-acme.vercel.app',
    );
  });

  it('reads the JSON the CLI answers with when it thinks it is talking to a program', () => {
    const json = JSON.stringify(
      { id: 'dpl_xyz', url: 'https://app-hash-acme.vercel.app', readyState: 'READY', target: 'production' },
      null,
      2,
    );
    expect(parseDeployUrl(json, humanStderr)).toBe('https://app-hash-acme.vercel.app');
  });

  it('reads it out of the status envelope too', () => {
    const json = JSON.stringify(
      {
        status: 'ok',
        deployment: { id: 'dpl_xyz', url: 'https://app-hash-acme.vercel.app', readyState: 'READY' },
        message: 'Deployment app-hash-acme.vercel.app ready.',
      },
      null,
      2,
    );
    // Nothing but `}` on the last line of that — which is what the old reading
    // of "the last line of stdout" turned a successful deploy into.
    expect(parseDeployUrl(json, '')).toBe('https://app-hash-acme.vercel.app');
  });

  it('still reads a bare URL on a line of its own', () => {
    expect(parseDeployUrl('https://app-hash-acme.vercel.app\n', '')).toBe('https://app-hash-acme.vercel.app');
  });

  it('never answers with the dashboard link', () => {
    expect(parseDeployUrl('', '  Inspect         https://vercel.com/acme/app/dpl_xyz\n')).toBeUndefined();
  });

  it('answers with nothing when there is nothing', () => {
    expect(parseDeployUrl('', '')).toBeUndefined();
    expect(parseDeployUrl()).toBeUndefined();
  });
});

describe('project naming', () => {
  it('reads the name off the command line either way', () => {
    expect(projectNameArg(['--project', 'acme-inbox'])).toBe('acme-inbox');
    expect(projectNameArg(['--project=acme-inbox'])).toBe('acme-inbox');
    expect(projectNameArg(['--project', '--other'])).toBeUndefined();
    expect(projectNameArg([])).toBeUndefined();
  });

  it('reads the existing project names out of `vercel project ls`', () => {
    // Taken names matter: `vercel link --project X` does not refuse one that
    // exists, it links to it — and the next steps overwrite its variables and
    // deploy over whatever was live there.
    const listing = [
      'Vercel CLI 59.1.4 (Node.js 22.22.0)',
      'Fetching projects in acme',
      '> Projects found under acme  [3s]',
      '',
      '  Project Name   Latest Production URL             Updated   Node Version   ',
      '  chatfuel-app   https://chatfuel-app.vercel.app   4m        24.x           ',
      '  acme-inbox     https://acme-inbox.vercel.app     2d        22.x           ',
      '',
      '> Vercel Plugin for Claude Code is not installed.',
    ].join('\n');
    expect(parseProjectNames(listing)).toEqual(['chatfuel-app', 'acme-inbox']);
  });

  it('reads nothing out of an empty account', () => {
    expect(parseProjectNames('Vercel CLI 59.1.4\nNo projects found.\n')).toEqual([]);
  });
});

/**
 * The other half: what the script does when the network, not the build, is what
 * failed. A deploy died here on a bare `fetch failed` seconds after the upload,
 * because the machine's egress policy blocked the Vercel CLI's telemetry host -
 * a host a deploy does not need. Two things are asserted below: telemetry is no
 * longer reachable from these calls at all, and a transport failure names a host
 * instead of blaming the build.
 */

describe('childEnv', () => {
  it('switches telemetry off without dropping the rest of the environment', () => {
    const env = childEnv({ PATH: '/usr/bin', HTTPS_PROXY: 'http://proxy:8080' });
    expect(env.VERCEL_TELEMETRY_DISABLED).toBe('1');
    expect(env.PATH).toBe('/usr/bin');
    // The proxy variables have to survive: the CLI reaches Vercel through them.
    expect(env.HTTPS_PROXY).toBe('http://proxy:8080');
  });

  it('overrides a value that is already there', () => {
    // The CLI reads the variable as "set at all", so a 0 in somebody's shell is
    // already off to it. Honouring the string would only bring the failure back.
    expect(childEnv({ VERCEL_TELEMETRY_DISABLED: '0' }).VERCEL_TELEMETRY_DISABLED).toBe('1');
  });

  it('leaves exactly one telemetry key, whatever case the old one was in', () => {
    // Environment names are case-insensitive on Windows, so a lowercase copy
    // sitting next to ours would be a coin flip.
    const env = childEnv({ vercel_telemetry_disabled: '0', PATH: '/usr/bin' });
    const keys = Object.keys(env).filter((key) => key.toLowerCase() === 'vercel_telemetry_disabled');
    expect(keys).toEqual(['VERCEL_TELEMETRY_DISABLED']);
  });

  it('does not write to the environment it was given', () => {
    const original = { PATH: '/usr/bin' };
    childEnv(original);
    expect(original).toEqual({ PATH: '/usr/bin' });
  });

  it('drops the two variables that steer npm exec', () => {
    // Left in place, npx runs `sh -c 'vercel@latest whoami'` instead of the
    // package's bin, and the whole deploy dies on `command not found`.
    const env = childEnv({
      npm_config_package: 'some-tarball.tgz',
      NPM_CONFIG_CALL: 'chatfuel-wizard',
      npm_config_registry: 'https://registry.example.com',
      PATH: '/usr/bin',
    });
    expect(env.npm_config_package).toBeUndefined();
    expect(env.NPM_CONFIG_CALL).toBeUndefined();
    // Everything else npm exports has to survive: this is how a nested npx
    // reaches a registry at all.
    expect(env.npm_config_registry).toBe('https://registry.example.com');
    expect(env.PATH).toBe('/usr/bin');
  });
});

/**
 * The step that turns "the CLI never ran" into a sentence. Before it existed,
 * a CLI that could not start came back as `whoami` exiting non-zero, the run
 * opened a login with a binary that did not exist, and the report was
 * `Vercel login did not complete.` — with the real reason on screen and named
 * nowhere.
 */
describe('stepCli', () => {
  const npx = { bin: 'npx', prefix: ['--yes', 'vercel@latest'], label: 'npx vercel@latest' };
  const answering = (result: { status: number; stdout: string; stderr: string }) => makeRunner(npx, () => result);

  /** fail() ends the process; here it ends the call, so the message can be read. */
  const capturingFail = () => {
    const lines: string[] = [];
    const exit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    return { lines, restore: () => [exit, error, log].forEach((spy) => spy.mockRestore()) };
  };

  it('says the version and moves on when the CLI runs', async () => {
    const { lines, restore } = capturingFail();
    try {
      await stepCli(answering({ status: 0, stdout: 'Vercel CLI 59.5.0\n', stderr: '' }), npx);
    } finally {
      restore();
    }
    // The CLI names itself in that line; the step is already saying so.
    expect(lines.join('\n')).toContain('npx vercel@latest (59.5.0)');
  });

  it('stops on the CLI, quoting what the CLI said', async () => {
    const { lines, restore } = capturingFail();
    try {
      await expect(
        stepCli(answering({ status: 127, stdout: '', stderr: 'sh: vercel@latest: command not found\n' }), npx),
      ).rejects.toThrow('exit:1');
    } finally {
      restore();
    }
    const said = lines.join('\n');
    expect(said).toContain('The Vercel CLI could not be started');
    expect(said).toContain('sh: vercel@latest: command not found');
    expect(said).toContain('npm i -g vercel');
    // The failure this replaces: it must not be blamed on the sign-in.
    expect(said).not.toContain('login');
  });
});

describe('listProjectNames', () => {
  /** A runner that answers each call in turn and records what it was asked. */
  const recordingRunner = (...results: { status: number; stdout?: string; stderr?: string }[]) => {
    const calls: string[][] = [];
    let index = 0;
    const run = (args: string[]) => {
      calls.push(args);
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
    };
    return { run, calls };
  };

  const page = (...names: string[]) =>
    ['  Project           Latest Deployment', ...names.map((name) => `  ${name}   1d ago`)].join('\n');

  it('is undefined when the call failed, rather than an empty account', () => {
    // The failure this replaces: the status was never read, an error came back
    // as no projects, and every name looked free - so the deploy walked into a
    // project that already existed and replaced what was live under it.
    const { run } = recordingRunner({ status: 1, stderr: 'Error: not authorized' });
    expect(listProjectNames(run)).toBeUndefined();
  });

  it('reads every page, not only the first', () => {
    const { run, calls } = recordingRunner(
      {
        status: 0,
        stdout: `${page('alpha', 'beta')}\n\nTo display the next page, run \`vercel project ls --next 1700000000\``,
      },
      { status: 0, stdout: page('gamma') },
    );
    expect([...listProjectNames(run)!].sort()).toEqual(['alpha', 'beta', 'gamma']);
    expect(calls[1]).toContain('--next');
    expect(calls[1]).toContain('1700000000');
  });

  it('falls back to the plain call when the CLI has no --limit', () => {
    const { run, calls } = recordingRunner(
      { status: 1, stderr: 'unknown option --limit' },
      { status: 0, stdout: page('alpha') },
    );
    expect([...listProjectNames(run)!]).toEqual(['alpha']);
    expect(calls[0]).toContain('--limit');
    expect(calls[1]).toEqual(['project', 'ls']);
  });

  it('gives up rather than looping on a cursor that does not move', () => {
    const { run, calls } = recordingRunner({
      status: 0,
      stdout: `${page('alpha')}\n\nTo display the next page, run \`vercel project ls --next 1700000000\``,
    });
    expect([...listProjectNames(run)!]).toEqual(['alpha']);
    expect(calls.length).toBe(2);
  });
});

describe('the Vercel runners', () => {
  const cli = { bin: 'vercel', prefix: [] };
  const capture = () => {
    const seen: { args?: string[]; options?: Record<string, unknown> } = {};
    return {
      seen,
      spy: (_bin: string, args: string[], options: Record<string, unknown>) => {
        seen.args = args;
        seen.options = options;
        return { status: 0, stdout: '', stderr: '' };
      },
    };
  };

  // argv is world-readable on the machine that runs the deploy and is copied
  // into CI process-audit logs. The CLI reads VERCEL_TOKEN off the environment,
  // which childEnv already hands it whole.
  it('never puts the Vercel token on the command line', () => {
    const saved = process.env.VERCEL_TOKEN;
    process.env.VERCEL_TOKEN = 'a-live-looking-token';
    try {
      const { seen, spy } = capture();
      makeRunner(cli, spy)(['whoami']);
      expect(seen.args).toEqual(['whoami']);
      expect(seen.args?.join(' ')).not.toContain('a-live-looking-token');
      expect((seen.options?.env as Record<string, string>).VERCEL_TOKEN).toBe('a-live-looking-token');
    } finally {
      if (saved === undefined) delete process.env.VERCEL_TOKEN;
      else process.env.VERCEL_TOKEN = saved;
    }
  });

  it('gives every captured call the telemetry flag', () => {
    const { seen, spy } = capture();
    makeRunner(cli, spy)(['whoami']);
    expect((seen.options?.env as Record<string, string>).VERCEL_TELEMETRY_DISABLED).toBe('1');
  });

  it('keeps the flag even when the caller passes its own environment', () => {
    // The flag goes on after the spread on purpose: it is not a preference a
    // caller gets to express.
    const { seen, spy } = capture();
    makeRunner(cli, spy)(['whoami'], { env: { PATH: '/bin' } });
    const env = seen.options?.env as Record<string, string>;
    expect(env.VERCEL_TELEMETRY_DISABLED).toBe('1');
    expect(env.PATH).toBe('/bin');
  });

  it('gives the streamed deploy the same flag, and says how it ended', async () => {
    let seen: Record<string, unknown> | undefined;
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill() {},
    });
    const runStreamed = makeStreamRunner(cli, (_bin: string, _args: string[], options: Record<string, unknown>) => {
      seen = options;
      return child;
    });
    const finished = runStreamed(['deploy', '--prod', '--yes']);
    child.emit('close', 0, null);
    const result = await finished;
    expect((seen?.env as Record<string, string>).VERCEL_TELEMETRY_DISABLED).toBe('1');
    // A kill on the timeout looks the same in the exit status as a build that
    // failed, and it is not the same thing.
    expect(result).toMatchObject({ status: 0, timedOut: false });
  });
});

describe('looksLikeNetworkFailure', () => {
  it('recognises the failure this exists for', () => {
    // What the CLI printed, in full, on the run that died.
    expect(looksLikeNetworkFailure('Error: fetch failed')).toBe(true);
  });

  it('recognises the rest of the transport failures', () => {
    for (const line of [
      'getaddrinfo ENOTFOUND api.vercel.com',
      'connect ECONNREFUSED 127.0.0.1:3128',
      'getaddrinfo EAI_AGAIN registry.npmjs.org',
      'connect ETIMEDOUT 76.76.21.21:443',
      'socket hang up',
      'unable to verify the first certificate',
      'Proxy response (403) !== 200 when HTTP Tunneling',
      'npm ERR! network timeout at: https://registry.npmjs.org/vercel',
    ]) {
      expect(looksLikeNetworkFailure(line)).toBe(true);
    }
  });

  it('reads through the colour codes', () => {
    expect(looksLikeNetworkFailure('\u001B[31mError: fetch failed\u001B[39m')).toBe(true);
  });

  it('does not call an ordinary build failure a network problem', () => {
    // The expensive mistake: every failing build would cost a host probe and
    // print a firewall diagnosis over a type error.
    expect(looksLikeNetworkFailure('Error: Command "npm run build" exited with 1')).toBe(false);
    expect(looksLikeNetworkFailure("src/app.tsx(4,10): error TS2304: Cannot find name 'Foo'.")).toBe(false);
    expect(looksLikeNetworkFailure('Deploying to the network edge')).toBe(false);
  });
});

describe('hostsInOutput', () => {
  const humanStderr = [
    'Vercel CLI 59.1.4 (Node.js 22.22.0)',
    '  Inspect         https://vercel.com/acme/app/dpl_xyz',
    '▲ Production      https://app-hash-acme.vercel.app',
    '',
  ].join('\n');

  it('names the host the output named', () => {
    expect(hostsInOutput('Error: getaddrinfo ENOTFOUND telemetry.vercel.com')).toEqual(['telemetry.vercel.com']);
  });

  it('reads a host out of a URL, but only on a line that failed', () => {
    expect(
      hostsInOutput('Failed to send telemetry events. fetch failed: https://telemetry.vercel.com/api/v1/e'),
    ).toEqual(['telemetry.vercel.com']);
    // The Inspect link and the deployment URL sit on healthy lines. Harvesting
    // them would name a working host every single time.
    expect(hostsInOutput(humanStderr)).toEqual([]);
    expect(hostsInOutput('Error: Command "npm run build" exited with 1')).toEqual([]);
  });

  it('drops the port, so a refused local proxy is still named', () => {
    expect(hostsInOutput('connect ECONNREFUSED 127.0.0.1:3128')).toEqual(['127.0.0.1']);
  });

  it('names each host once, in the order it first appeared', () => {
    const output = [
      'getaddrinfo ENOTFOUND telemetry.vercel.com',
      'fetch failed https://api.vercel.com/v2/deployments',
      'getaddrinfo ENOTFOUND telemetry.vercel.com',
    ].join('\n');
    expect(hostsInOutput(output)).toEqual(['telemetry.vercel.com', 'api.vercel.com']);
  });

  it('reads through the colour codes', () => {
    expect(hostsInOutput('\u001B[31mgetaddrinfo ENOTFOUND api.vercel.com\u001B[39m')).toEqual(['api.vercel.com']);
  });
});

describe('deployHosts', () => {
  it('names the registry only when the CLI has to be fetched to run', () => {
    expect(deployHosts(false)).toEqual(['api.vercel.com']);
    expect(deployHosts(true)).toContain('registry.npmjs.org');
  });

  it('never asks anybody to allow the telemetry host', () => {
    // The assertion that ties the two halves together: telemetry is off for
    // every call, so a deploy does not need that host and the message must not
    // send somebody to open a hole for it.
    for (const hosts of [deployHosts(false), deployHosts(true)]) {
      expect(hosts).not.toContain('telemetry.vercel.com');
    }
  });
});

describe('networkFailureLines', () => {
  const proxy = 'HTTPS_PROXY=http://proxy:8080';

  it('leads with the host the output named', () => {
    const lines = networkFailureLines({ named: ['telemetry.vercel.com'], checked: ['api.vercel.com'], proxy });
    expect(lines[0]).toBe('The deployment could not reach telemetry.vercel.com.');
    expect(lines[1]).toBe('Allow telemetry.vercel.com from this machine, then run this again.');
    expect(lines[2]).toBe(`Requests went through ${proxy} — check that it allows telemetry.vercel.com.`);
  });

  it('falls back to the host that did not answer the probe', () => {
    const lines = networkFailureLines({ unreachable: ['api.vercel.com'], checked: ['api.vercel.com'] });
    expect(lines[0]).toBe('The deployment failed on the network, not on the build.');
    expect(lines[1]).toBe('api.vercel.com did not answer from this machine, and a deploy needs it.');
  });

  it('does not accuse a host that answered', () => {
    // The honest branch. Claiming a reachable host is blocked sends people off
    // to change a firewall rule that was never the problem.
    const lines = networkFailureLines({ checked: ['api.vercel.com', 'registry.npmjs.org'], proxy });
    expect(lines[1]).toBe(
      'api.vercel.com, registry.npmjs.org answered from this machine, so the host it could not reach is none of those.',
    );
    expect(lines[2]).toBe(`Requests went through ${proxy} — its own log names the host it refused.`);
  });

  it('leaves the proxy line out when there is no proxy', () => {
    const lines = networkFailureLines({ named: ['api.vercel.com'] });
    expect(lines.some((line: string) => line.includes('Requests went through'))).toBe(false);
  });

  it('names what failed when it was not the deployment', () => {
    const lines = networkFailureLines({ what: 'The Vercel sign-in check', named: ['api.vercel.com'] });
    expect(lines[0]).toBe('The Vercel sign-in check could not reach api.vercel.com.');
  });

  it('always returns a reason to lead with', () => {
    // The caller renders lines[0] as the message and the rest as the hint.
    expect(networkFailureLines()[0]).toBeTruthy();
  });
});

describe('what the deploy pushes against what the proxy reads', () => {
  // The proxy takes its whole configuration from the environment, so a variable
  // missing from DEPLOY_ENV is a setting that works in dev and quietly reverts
  // to its default in production - a fence that is off, an allowlist that is
  // not applied, a per-tenant ceiling that never comes down. Nothing fails when
  // that happens, which is why it is checked here.
  const proxyConfig = join(dirname(fileURLToPath(import.meta.url)), '../../vite-plugin-proxy/src/proxyConfig.ts');

  it('pushes every variable proxyConfig.ts reads', () => {
    // Absent in an app the wizard scaffolded: there the proxy is vendored and
    // this path does not exist. In this repository it does, and it is the copy
    // the list has to keep up with.
    if (!existsSync(proxyConfig)) return;
    expect(undeployedProxyVars(readFileSync(proxyConfig, 'utf8'))).toEqual([]);
  });

  it('names what it would not push', () => {
    expect(undeployedProxyVars('const a = env.CHATFUEL_TOKEN; const b = env.NOT_PUSHED_ANYWHERE;')).toEqual([
      'NOT_PUSHED_ANYWHERE',
    ]);
  });

  it('leaves the platform’s own variables alone', () => {
    expect(undeployedProxyVars('env.VERCEL_AUTOMATION_BYPASS_SECRET, env.PORT')).toEqual([]);
  });

  it('pushes the tenant ceilings and the fence, which used to be left behind', () => {
    const pushed = DEPLOY_ENV.map((entry) => entry.name);
    for (const name of [
      'CHATFUEL_RESOURCE_FENCE',
      'CHATFUEL_RESOURCE_STORE',
      'CHATFUEL_OPERATION_ALLOWLIST',
      'CHATFUEL_OPERATION_ALLOWLIST_EXTRA',
      'CHATFUEL_OPERATION_ALLOWLIST_OFF',
      'TENANT_REQUESTS_PER_MINUTE',
      'TENANT_MAX_SOCKETS',
      'TRUST_FORWARDED_FOR',
      'AUTH_RECOVERY_LINK_LOG',
    ]) {
      expect(pushed).toContain(name);
    }
  });
});

describe('describeProxy', () => {
  // A copy of the one the wizard uses, because this script ships inside the app
  // and cannot import from it. The copy needs its own guard against drift.
  it('names the variable and never prints the password', () => {
    expect(describeProxy({ HTTPS_PROXY: 'http://proxy:8080' })).toBe('HTTPS_PROXY=http://proxy:8080');
    const masked = describeProxy({ HTTPS_PROXY: 'http://user:hunter2@proxy:8080' });
    expect(masked).toContain('***');
    expect(masked).not.toContain('hunter2');
  });

  it('says nothing when no proxy is set', () => {
    expect(describeProxy({})).toBeUndefined();
  });
});
