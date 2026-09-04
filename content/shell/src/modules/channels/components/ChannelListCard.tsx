import { useState, type ReactNode } from 'react';
import { Button, Card, ConfirmDialog, Tag } from '~ui';
import type { ChannelAsset } from '../lib/channels';
import { errorMessage } from '../lib/errors';

export interface ChannelListCardProps {
  title: string;
  icon: ReactNode;
  assets: readonly ChannelAsset[];
  /** Off for the web widget: the server refuses to disconnect it, so no button is drawn. */
  canDisconnect: boolean;
  pending: readonly string[];
  onDisconnect(scopeId: string): Promise<void>;
}

/**
 * A platform with no link form — Facebook pages (any number of them) and the
 * web widget: the connected assets as rows, and Disconnect where the server
 * allows it.
 *
 * An asset with no name prints no row: the widget's `name` is the empty string
 * on every bot, and a row holding a blank is a card body with nothing in it.
 * The chip already says whether anything is connected.
 */
export function ChannelListCard({ title, icon, assets, canDisconnect, pending, onDisconnect }: ChannelListCardProps) {
  const [confirm, setConfirm] = useState<ChannelAsset | null>(null);
  const named = assets.filter((asset) => asset.label !== '' || canDisconnect);

  const rows =
    named.length === 0 ? undefined : (
      <ul className="flex flex-col gap-2">
        {named.map((asset) => (
          <li key={asset.scopeId} className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-text">{asset.label}</span>
            {canDisconnect ? (
              <Button
                variant="dangerGhost"
                size="sm"
                disabled={pending.includes(`disconnect:${asset.scopeId}`)}
                onClick={() => setConfirm(asset)}
              >
                Disconnect
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </span>
        }
        actions={
          <Tag tone={assets.length > 0 ? 'success' : 'neutral'}>
            {assets.length > 0 ? 'Connected' : 'Not connected'}
          </Tag>
        }
      >
        {rows}
      </Card>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={`Disconnect ${confirm?.label ?? ''}?`}
        confirmLabel="Disconnect"
        onConfirm={async () => {
          if (!confirm) return;
          try {
            await onDisconnect(confirm.scopeId);
          } catch (err) {
            throw new Error(errorMessage(err), { cause: err });
          }
        }}
      >
        <p>The bot stops receiving messages on this channel.</p>
      </ConfirmDialog>
    </>
  );
}
