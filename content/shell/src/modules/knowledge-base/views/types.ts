import type { Band } from '~ui';
import type { Finding } from '../lib/lint';
import type { KnowledgeParams } from '../lib/knowledgeParams';
import type { KnowledgeRole } from '../types';

/**
 * FROZEN: every source page takes exactly this, so adding or rewriting one
 * never edits `KnowledgeBaseWorkspace`.
 *
 * A page owns its own toolbar, its own drafts and its own mutations; it does
 * NOT own the URL (it patches through `onParams`), the data (both stores are
 * contexts) or the undo offer (a context too). Only the selected page is
 * mounted, so a page may load whatever it likes on mount.
 */
export interface KnowledgeViewProps {
  role: KnowledgeRole;
  params: KnowledgeParams;
  /** Patch this module's deep link. Runs through the workspace's unsaved-changes guard. */
  onParams: (patch: Partial<KnowledgeParams>) => void;
  band: Band;
  /** Report whether a load is in flight, so the header can spin. */
  onBusy: (busy: boolean) => void;
  /** Findings for THIS source, already filtered and sorted worst-first. */
  findings: readonly Finding[];
  /**
   * False on a mirror whose owning module is installed: Services and Team are
   * edited in Bookings, and this page shows them read-only with a link.
   */
  canEditHere: boolean;
}
