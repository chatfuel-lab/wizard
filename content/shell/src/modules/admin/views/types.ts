import type { Band } from '~ui';
import type { AdminAddress } from '../lib/adminParams';

/**
 * The frozen contract every view in this module is handed.
 *
 * Deliberately narrow: the store and the client come from `AdminContext`, so a
 * view added later needs nothing added here, and the three that exist cannot
 * drift into taking different props for the same job.
 */
export interface AdminViewProps {
  band: Band;
  address: AdminAddress;
  /** Rewrite part of the address; the rest is left alone. */
  patch: (next: Partial<AdminAddress>) => void;
}
