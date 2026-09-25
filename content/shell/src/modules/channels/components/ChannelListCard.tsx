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
  /**
   * Facebook only: what a platform link can still do for this list (see
   * `facebookLinkAction`). Absent for the web widget, which takes no link, and
   * for a role that cannot manage channels.
   */
  link?: ChannelListLink;
}

export interface ChannelListLink {
  action: 'connect' | 'refresh' | null;
  busy: boolean;
  onConnect(): Promise<void>;
  onRefreshAccess(): Promise<void>;
}

/**
 * A platform that holds a list rather than one asset — Facebook pages (any
 * number of them) and the web widget: the connected assets as rows, and
 * Disconnect where the server allows it. Facebook also takes a link: Connect
 * with no page yet, Refresh access with exactly one.
 *
 * An asset with no name prints no row: the widget's `name` is the empty string
 * on every bot, and a row holding a blank is a card body with nothing in it.
 * The chip already says whether anything is connected.
 */
export function ChannelListCard({
  title,
  icon,
  assets,
  canDisconnect,
  pending,
  onDisconnect,
  link,
}: ChannelListCardProps) {
  const [confirm, setConfirm] = useState<ChannelAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const named = assets.filter((asset) => asset.label !== '' || canDisconnect);

  const leave = async (run: () => Promise<void>) => {
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const rows =
    named.length === 0 ? null : (
      <ul className="flex flex-col gap-2">
        {named.map((asset) => (
          <li key={asset.scopeId} className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-text">{asset.label}</span>
            {canDisconnect ? (
              <div className="flex items-center gap-2">
                {link?.action === 'refresh' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={link.busy}
                    disabled={pending.includes(`disconnect:${asset.scopeId}`)}
                    onClick={() => void leave(link.onRefreshAccess)}
                  >
                    Refresh access
                  </Button>
                ) : null}
                <Button
                  variant="dangerGhost"
                  size="sm"
                  disabled={link?.busy || pending.includes(`disconnect:${asset.scopeId}`)}
                  onClick={() => setConfirm(asset)}
                >
                  Disconnect
                </Button>
              </div>
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
        {rows || link?.action === 'connect' || error ? (
          <div className="flex flex-col gap-3">
            {rows}
            {link?.action === 'connect' ? (
              <div>
                <Button variant="primary" size="sm" loading={link.busy} onClick={() => void leave(link.onConnect)}>
                  Connect
                </Button>
              </div>
            ) : null}
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </div>
        ) : undefined}
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
