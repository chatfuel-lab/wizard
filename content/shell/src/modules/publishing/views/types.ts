import type { RefObject } from 'react';
import type { Band } from '~ui';
import type { CalendarMode, PublishingAddress } from '../lib/publishingParams';
import type { Account } from '../types';

/**
 * The contract between `PublishingApp` and a view. Frozen: every view takes
 * exactly this, so adding or rewriting one never edits the workspace.
 *
 * A view does NOT own its rows. The calendar and the queue draw the same posts
 * from the same store — two views over one list is the whole point of having
 * both — so the store is a provider and only the library, which reads the
 * account's media rather than the queue, fetches for itself. What a view does
 * own is its own toolbar, its own address keys and its own layout.
 *
 * Only the active view is mounted.
 */
export interface PublishingViewProps {
  /** Already resolved by the workspace; a view never re-measures. */
  band: Band;
  address: PublishingAddress;
  /** Merge into the address. A view change pushes, anything else replaces. */
  patch: (next: Partial<PublishingAddress>) => void;
  /** Open the composer. `at` seeds a new post's time from the slot that was clicked. */
  onCompose: (target: string, at?: string | null) => void;
  /** Report whether a refresh is still in flight, so the header can spin. */
  onBusy: (busy: boolean) => void;
  /** Bumped by the header's refresh button; a view refetches when it changes. */
  refreshToken: number;
  /**
   * The connected account, as the workspace's one `useAccount` answered it. A
   * view is only mounted once the gate says ready, so this is never absent —
   * and a view must read it rather than query again: two mounts of the account
   * hook are two queries, and a refresh reaches only one of them.
   */
  account: Account;
  /**
   * The module root, for a view that installs keys of its own.
   *
   * It is the module's root and not the view's on purpose: `useHotkeys` treats
   * "focus on nothing" as in scope for whatever root it is given, and scoping to
   * the module is what keeps a keystroke meant for a host app out of here. Only
   * one view is mounted at a time, so two listeners on the same root cannot
   * belong to two views at once.
   */
  rootRef: RefObject<HTMLElement | null>;
}

export type { CalendarMode };
