import type { RefObject } from 'react';
import type { Band } from '~ui';
import type { BotFactsState } from '../hooks/useBotFacts';
import type { MyRole } from '../hooks/useMyRole';
import type { BroadcastsAddress, ComposerStep } from '../lib/broadcastsParams';

/**
 * The contract between `BroadcastsWorkspace` and a view. FROZEN: every view
 * takes exactly this, so adding or rewriting one never edits the workspace,
 * and three tracks can build views at once.
 *
 * A view owns what it draws. It shares the address, the layout band, the
 * role, the bot facts, the display zone and the clock — and reports its busy
 * state upward so the header shows one spinner. The campaign list and the
 * template catalog come from contexts (`useCampaigns`, `useCatalog`), so two
 * views never fetch the same thing twice.
 *
 * Only the active view is mounted.
 */
export interface BroadcastsViewProps {
  address: BroadcastsAddress;
  /** Rewrite part of the address; the shell owns the rest. */
  patch: (next: Partial<BroadcastsAddress>) => void;
  band: Band;
  role: MyRole;
  bot: BotFactsState;
  /** The zone every time is shown in: the bot's, or the operator's when the bot has none. */
  zone: string;
  /** "Now", moving once a minute. */
  now: number;
  onBusy: (busy: boolean) => void;
  /** Open the composer on a draft. */
  onCompose: (flowId: string, step?: ComposerStep | null) => void;
  /** Make a new draft and open the composer on it. */
  onNewCampaign: () => void;
  /** Take the person where a WhatsApp number is connected. Null when this deployment has nowhere to send them. */
  onConnectWhatsApp: (() => void) | null;
  /** The module root, for anything scoped to it. */
  rootRef: RefObject<HTMLElement | null>;
}

/** What the composer route takes. The draft it edits is named by the address. */
export interface ComposerRouteProps {
  flowId: string;
  step: ComposerStep | null;
  onStep: (step: ComposerStep) => void;
  /** Leave for the list, with the campaign's panel open. */
  onClose: () => void;
  /** Move the composer onto another draft — the copy a duplicate just made. */
  onCompose: (flowId: string, step?: ComposerStep | null) => void;
  onConnectWhatsApp: (() => void) | null;
  band: Band;
  role: MyRole;
  bot: BotFactsState;
  zone: string;
  now: number;
  rootRef: RefObject<HTMLElement | null>;
}
