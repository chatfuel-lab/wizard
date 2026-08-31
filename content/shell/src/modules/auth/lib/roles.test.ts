import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canManageTeam,
  canRemove,
  canResetPassword,
  canTransfer,
  roleLabel,
  roleTone,
  sortMembers,
} from './roles';

describe('roles', () => {
  it('canManageTeam: owner and admin only', () => {
    expect(canManageTeam('owner')).toBe(true);
    expect(canManageTeam('admin')).toBe(true);
    expect(canManageTeam('member')).toBe(false);
    expect(canManageTeam(null)).toBe(false);
    expect(canManageTeam(undefined)).toBe(false);
  });

  it('assignableRoles: below the actor only — an admin does not touch an equal', () => {
    expect(assignableRoles('owner', 'owner')).toEqual([]);
    expect(assignableRoles('admin', 'owner')).toEqual([]);
    expect(assignableRoles('owner', 'admin')).toEqual(['member']);
    expect(assignableRoles('owner', 'member')).toEqual(['admin']);
    // The RPC refuses this one (PT403 rank), so the menu must not offer it.
    expect(assignableRoles('admin', 'admin')).toEqual([]);
    expect(assignableRoles('admin', 'member')).toEqual(['admin']);
    expect(assignableRoles('member', 'member')).toEqual([]);
    expect(assignableRoles('member', 'admin')).toEqual([]);
  });

  it('canResetPassword: a credential for the account, so strictly below the actor', () => {
    expect(canResetPassword('owner', 'admin')).toBe(true);
    expect(canResetPassword('owner', 'member')).toBe(true);
    expect(canResetPassword('admin', 'member')).toBe(true);
    expect(canResetPassword('admin', 'admin')).toBe(false);
    expect(canResetPassword('admin', 'owner')).toBe(false);
    expect(canResetPassword('owner', 'owner')).toBe(false);
    expect(canResetPassword('member', 'member')).toBe(false);
  });

  it('canRemove: strictly below the actor', () => {
    expect(canRemove('owner', 'admin')).toBe(true);
    expect(canRemove('admin', 'member')).toBe(true);
    expect(canRemove('admin', 'admin')).toBe(false);
    expect(canRemove('admin', 'owner')).toBe(false);
    expect(canRemove('owner', 'owner')).toBe(false);
    expect(canRemove('member', 'member')).toBe(false);
  });

  it('canTransfer: owner only', () => {
    expect(canTransfer('owner')).toBe(true);
    expect(canTransfer('admin')).toBe(false);
    expect(canTransfer('member')).toBe(false);
  });

  it('labels and tones', () => {
    expect(roleLabel('owner')).toBe('Owner');
    expect(roleLabel('admin')).toBe('Admin');
    expect(roleLabel('member')).toBe('Member');
    expect(roleTone('owner')).toBe('accent');
    expect(roleTone('admin')).toBe('success');
    expect(roleTone('member')).toBe('neutral');
  });

  it('sortMembers: owner → admin → member → joinedAt, stable on ties by name', () => {
    const rows = [
      { role: 'member' as const, joinedAt: '2026-02-01T00:00:00Z', name: 'Zed', email: 'z@x' },
      { role: 'admin' as const, joinedAt: '2026-03-01T00:00:00Z', name: 'Ann', email: 'a@x' },
      { role: 'member' as const, joinedAt: '2026-01-01T00:00:00Z', name: null, email: 'b@x' },
      { role: 'owner' as const, joinedAt: '2026-04-01T00:00:00Z', name: 'Own', email: 'o@x' },
      { role: 'member' as const, joinedAt: '2026-01-01T00:00:00Z', name: 'Al', email: 'al@x' },
    ];
    expect(sortMembers(rows).map((r) => r.email)).toEqual(['o@x', 'a@x', 'al@x', 'b@x', 'z@x']);
    // input untouched
    expect(rows[0]!.email).toBe('z@x');
  });
});
