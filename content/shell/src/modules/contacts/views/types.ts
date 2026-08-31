import type { Band } from '~ui';
import type { Navigate } from '../../types';
import type { AttributeCatalog } from '../hooks/useAttributeCatalog';
import type { ContactsFilter } from '../lib/contactsFilter';
import type { Density } from '../lib/contactsParams';
import type { TeamMember } from '../types';

/**
 * The frozen surface contract.
 *
 * Every view takes exactly this and nothing else, so adding a surface — or
 * rewriting one — never edits `ContactsApp.tsx`. A view owns its own data, its
 * own toolbar and its own live channel; it reports counts and busy state
 * upward. When a view wants something that is not here, the answer is almost
 * always that it should own it, not that the contract should grow.
 */
export interface ContactsViewProps {
  filter: ContactsFilter;
  onFilterChange: (filter: ContactsFilter) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  /** Container width band, from `~ui`'s ModuleRoot. */
  band: Band;
  canEdit: boolean;
  /** The bot's people, for owner pickers and the assignee filter. */
  team: TeamMember[];
  /** The bot's attributes: column picker, filter builder, field editors. */
  catalog: AttributeCatalog;
  /** Open a contact as a full record page. */
  onOpenContact: (contactId: string) => void;
  /** Somewhere else in the app, as an app-relative path ('/livechat?c=42'). */
  navigate: Navigate;
  /**
   * Back to the list, carrying the filter and optionally asking for one more
   * column. The list is the module's root route, and the workspace is the one
   * that knows the current query — a view may not read the address bar.
   */
  onGoToList: (options?: { addColumn?: string }) => void;
  /** Bumped by the workspace's Refresh; a view refetches when it changes. */
  refreshToken: number;
  /**
   * A view reports the ids it is showing, in its own order.
   *
   * The one addition to this contract after it was frozen, and it earns its
   * place: opening a record page UNMOUNTS the list, so `←`/`→` on the record
   * would have nothing to walk. Optional, because only a list has an order.
   */
  onOrderChange?: (ids: readonly string[]) => void;
  /** A view reports its own headline count so the header can print it. */
  onCount: (count: { shown: number; server: number | null } | null) => void;
  /** A view reports that it is working, so the header can show a spinner. */
  onBusy: (busy: boolean) => void;
}
