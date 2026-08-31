import { describe, expect, it } from 'vitest';
import { secretFlagsInUse } from '../src/secretFlags';
import type { WizardFlags } from '../src/context';

const base: WizardFlags = { yes: false, dryRun: false, verbose: false };

describe('secretFlagsInUse', () => {
  it('is silent when the credentials did not come from the command line', () => {
    expect(secretFlagsInUse({ ...base, supabaseProject: 'abcdefghijklmnop' })).toEqual([]);
  });

  it('names the flag and the environment variable that replaces it', () => {
    expect(secretFlagsInUse({ ...base, supabaseToken: 'sbp_' + 'f'.repeat(40) })).toEqual([
      { flag: '--supabase-token', env: 'SUPABASE_ACCESS_TOKEN' },
    ]);
  });

  it('names both when both were passed', () => {
    const used = secretFlagsInUse({ ...base, supabaseToken: 'sbp_x', adminPassword: 'p'.repeat(16) });
    expect(used.map((u) => u.flag)).toEqual(['--supabase-token', '--admin-password']);
  });

  it('ignores a flag that carries no value', () => {
    expect(secretFlagsInUse({ ...base, adminPassword: '' })).toEqual([]);
  });
});
