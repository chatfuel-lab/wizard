import { useState } from 'react';
import { Button, DataTable, Dialog, EmptyState, IconClose, IconPlus, IconUsers, Select, Tag } from '~ui';
import type { AdminTenant, AdminTenantBot, AdminTenantMember, AdminUnassignedBot } from '../types';

export interface AccessRow {
  key: string;
  tenant: AdminTenant;
  member: AdminTenantMember;
  /** Bots this person reaches through a grant row. Empty for an owner or admin. */
  granted: AdminTenantBot[];
}

export interface AccessTableProps {
  tenants: readonly AdminTenant[] | null;
  /** Bots in no workspace yet — grantable from any row, which is what settles them. */
  unassigned: readonly AdminUnassignedBot[];
  onGrant: (botId: string, userId: string, tenantId: string) => Promise<void>;
  onRevoke: (botId: string, userId: string) => Promise<void>;
}

const rowsOf = (tenants: readonly AdminTenant[]): AccessRow[] =>
  tenants.flatMap((tenant) =>
    tenant.members.map((member) => ({
      key: `${tenant.id}:${member.userId}`,
      tenant,
      member,
      granted: tenant.bots.filter((bot) => bot.granted.includes(member.userId)),
    })),
  );

/**
 * What a grant dialog may offer: the workspace's own bots this person does not
 * already reach, then the ones no workspace has claimed.
 *
 * Granting a workspace-less bot is the only thing that ever gives it one, so a
 * dialog drawn from `tenant.bots` alone made "assign it later" a door that opens
 * one way.
 */
export const grantOptions = (
  row: AccessRow,
  unassigned: readonly AdminUnassignedBot[],
): { value: string; label: string }[] => [
  ...row.tenant.bots
    .filter((bot) => bot.botId && !bot.granted.includes(row.member.userId))
    .map((bot) => ({ value: bot.botId!, label: bot.name })),
  ...unassigned.map((bot) => ({ value: bot.botId, label: `${bot.name} · no workspace yet` })),
];

/**
 * Who reaches which bot, across every account this app has.
 *
 * The rule the table draws is the one the database enforces and no screen may
 * restate differently: owners and admins reach every bot in their workspace by
 * role and hold no grant rows, so their bots column says so rather than listing
 * bots that could then be "revoked" from a table that has nothing to revoke.
 */
export function AccessTable({ tenants, unassigned, onGrant, onRevoke }: AccessTableProps) {
  const [granting, setGranting] = useState<AccessRow | null>(null);
  const [botId, setBotId] = useState('');
  const [busy, setBusy] = useState(false);

  if (!tenants) return null;
  const rows = rowsOf(tenants);

  const options = granting ? grantOptions(granting, unassigned) : [];

  const submit = async () => {
    if (!granting || !botId || busy) return;
    setBusy(true);
    try {
      await onGrant(botId, granting.member.userId, granting.tenant.id);
      setGranting(null);
      setBotId('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DataTable<AccessRow>
        rows={rows}
        rowKey={(row) => row.key}
        caption="People and the bots they reach"
        stickyHeader
        empty={<EmptyState icon={<IconUsers />} title="Nobody has signed up yet" />}
        columns={[
          {
            key: 'person',
            header: 'Person',
            render: (row) => row.member.email || row.member.name || row.member.userId,
          },
          { key: 'workspace', header: 'Workspace', width: '14rem', render: (row) => row.tenant.name },
          {
            key: 'role',
            header: 'Role',
            width: '8rem',
            render: (row) => <Tag tone={row.member.role === 'owner' ? 'accent' : 'neutral'}>{row.member.role}</Tag>,
          },
          {
            key: 'bots',
            header: 'Bots',
            wrap: true,
            render: (row) =>
              row.member.role === 'owner' || row.member.role === 'admin' ? (
                <span className="text-meta text-text-muted">Every bot in this workspace</span>
              ) : row.granted.length === 0 ? (
                <span className="text-meta text-text-muted">None</span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {row.granted.map((bot) => (
                    <span key={bot.slotId} className="inline-flex items-center gap-1">
                      <Tag>{bot.name}</Tag>
                      <Button
                        variant="ghost"
                        iconOnly
                        aria-label={`Revoke ${bot.name} from ${row.member.email ?? row.member.userId}`}
                        onClick={() => {
                          if (bot.botId) void onRevoke(bot.botId, row.member.userId);
                        }}
                      >
                        <IconClose />
                      </Button>
                    </span>
                  ))}
                </span>
              ),
          },
        ]}
        rowActions={(row) =>
          row.member.role === 'member' ? (
            <Button
              variant="ghost"
              iconOnly
              aria-label={`Grant a bot to ${row.member.email ?? row.member.userId}`}
              onClick={() => {
                setGranting(row);
                setBotId('');
              }}
            >
              <IconPlus />
            </Button>
          ) : null
        }
      />

      <Dialog
        open={granting !== null}
        onClose={() => setGranting(null)}
        title={`Grant a bot to ${granting?.member.email ?? granting?.member.name ?? ''}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGranting(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!botId} onClick={submit}>
              Grant
            </Button>
          </div>
        }
      >
        <Select value={botId} onChange={setBotId} aria-label="Bot" placeholder="Pick a bot" options={options} />
      </Dialog>
    </>
  );
}
