import { Alert, Button, IconFacebook, IconRefresh, IconWidget, PageBody, PageHeader, Spinner } from '~ui';
import { LINK_PLATFORMS, PLATFORM_TITLES, type LinkPlatform } from '../lib/channels';
import type { ChannelsState } from '../lib/channelsStore';
import type { HandOffResult } from '../lib/returnUrl';
import { ChannelListCard } from './ChannelListCard';
import { PlatformCard } from './PlatformCard';

export interface ChannelsPageProps {
  state: ChannelsState;
  canManage: boolean;
  /** What the return leg of a hand-off said, if this load is one. */
  handOff: HandOffResult | null;
  onDismissHandOff(): void;
  onRefresh(): void;
  onConnect(platform: LinkPlatform): Promise<void>;
  onRefreshAccess(platform: LinkPlatform): Promise<void>;
  onDisconnect(scopeId: string): Promise<void>;
}

/**
 * The page, drawn from state alone: a card per platform that takes a link,
 * then the Facebook pages and the web widget as read-only lists.
 *
 * A role without Configure: Edit sees what is connected and no control to
 * change it.
 */
export function ChannelsPage({
  state,
  canManage,
  handOff,
  onDismissHandOff,
  onRefresh,
  onConnect,
  onRefreshAccess,
  onDisconnect,
}: ChannelsPageProps) {
  const { scopes, pending } = state;

  return (
    <>
      <PageHeader
        title="Channels"
        actions={
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Refresh"
            loading={state.refreshing}
            onClick={onRefresh}
          >
            <IconRefresh />
          </Button>
        }
      />
      <PageBody measure="form">
        <div className="flex flex-col gap-4">
          {handOff && !handOff.ok ? (
            <Alert
              tone="danger"
              title={`${PLATFORM_TITLES[handOff.platform]} was not connected`}
              onDismiss={onDismissHandOff}
            >
              The hand-off came back without finishing. Press Connect to try again.
            </Alert>
          ) : null}
          {scopes.state === 'error' ? (
            <Alert
              tone="danger"
              title="Channels could not be read"
              action={
                <Button size="sm" variant="secondary" onClick={onRefresh}>
                  Try again
                </Button>
              }
            >
              {scopes.message}
            </Alert>
          ) : null}

          {scopes.state === 'loading' ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : scopes.state === 'ready' ? (
            <>
              {LINK_PLATFORMS.map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  asset={scopes.channels[platform]}
                  canManage={canManage}
                  pending={pending}
                  onConnect={onConnect}
                  onRefreshAccess={onRefreshAccess}
                  onDisconnect={onDisconnect}
                />
              ))}
              <ChannelListCard
                title="Facebook"
                icon={<IconFacebook />}
                assets={scopes.channels.facebook}
                canDisconnect={canManage}
                pending={pending}
                onDisconnect={onDisconnect}
              />
              <ChannelListCard
                title="Web widget"
                icon={<IconWidget />}
                assets={scopes.channels.widget ? [scopes.channels.widget] : []}
                canDisconnect={false}
                pending={pending}
                onDisconnect={onDisconnect}
              />
            </>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
