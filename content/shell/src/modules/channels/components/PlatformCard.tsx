import { useState, type ReactNode } from 'react';
import { Button, Card, ConfirmDialog, IconInstagram, IconTikTok, IconWhatsApp, Tag } from '~ui';
import { PLATFORM_TITLES, type ChannelAsset, type LinkPlatform } from '../lib/channels';
import { errorMessage } from '../lib/errors';

export interface PlatformCardProps {
  platform: LinkPlatform;
  asset: ChannelAsset | null;
  canManage: boolean;
  pending: readonly string[];
  onConnect(platform: LinkPlatform): Promise<void>;
  onRefreshAccess(platform: LinkPlatform): Promise<void>;
  onDisconnect(scopeId: string): Promise<void>;
}

const ICONS: Record<LinkPlatform, ReactNode> = {
  whatsapp: <IconWhatsApp size={16} />,
  instagram: <IconInstagram size={16} />,
  tiktok: <IconTikTok size={16} />,
};

/**
 * One platform: what is connected, and the one thing to do about it.
 *
 * Connecting leaves the app — the API cannot carry anybody through a
 * platform's OAuth, so the app hands the browser to the page Chatfuel serves
 * and is brought back here. That is why the button says Connect and not
 * "create a link": the link exists for the length of the redirect and is the
 * app's business, not the reader's.
 */
export function PlatformCard({
  platform,
  asset,
  canManage,
  pending,
  onConnect,
  onRefreshAccess,
  onDisconnect,
}: PlatformCardProps) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = pending.includes(`connect:${platform}`) || pending.includes(`refresh:${platform}`);
  const disconnecting = asset !== null && pending.includes(`disconnect:${asset.scopeId}`);

  const leave = async (run: (platform: LinkPlatform) => Promise<void>) => {
    setError(null);
    try {
      await run(platform);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {ICONS[platform]}
          <span>{PLATFORM_TITLES[platform]}</span>
        </span>
      }
      actions={<Tag tone={asset ? 'success' : 'neutral'}>{asset ? 'Connected' : 'Not connected'}</Tag>}
    >
      <div className="flex flex-col gap-3">
        {asset ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{asset.label}</p>
              {asset.detail ? <p className="truncate text-xs text-text-muted">{asset.detail}</p> : null}
            </div>
            {canManage ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busy}
                  disabled={disconnecting}
                  onClick={() => void leave(onRefreshAccess)}
                >
                  Refresh access
                </Button>
                <Button
                  variant="dangerGhost"
                  size="sm"
                  disabled={busy || disconnecting}
                  onClick={() => setConfirmDisconnect(true)}
                >
                  Disconnect
                </Button>
              </div>
            ) : null}
          </div>
        ) : canManage ? (
          <div>
            <Button variant="primary" size="sm" loading={busy} onClick={() => void leave(onConnect)}>
              Connect
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
      {asset ? (
        <ConfirmDialog
          open={confirmDisconnect}
          onClose={() => setConfirmDisconnect(false)}
          title={`Disconnect ${asset.label}?`}
          confirmLabel="Disconnect"
          onConfirm={async () => {
            try {
              await onDisconnect(asset.scopeId);
            } catch (err) {
              throw new Error(errorMessage(err), { cause: err });
            }
          }}
        >
          <p>The bot stops receiving messages on this channel.</p>
        </ConfirmDialog>
      ) : null}
    </Card>
  );
}
