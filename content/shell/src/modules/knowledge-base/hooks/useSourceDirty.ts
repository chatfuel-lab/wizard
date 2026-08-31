import { useEffect, useState } from 'react';
import { useDrafts } from '../KnowledgeBaseDraftContext';
import type { SourceId } from '../lib/sources';

/**
 * How many unsaved drafts this source is holding.
 *
 * `useDraftCount` counts every draft in the module, which is what the header
 * badge wants; a page's own save bar needs its own count. Only one source page
 * is mounted at a time, so in practice these agree — the distinction matters
 * because the save bar's Save must never claim to have saved somebody else's
 * page.
 */
export function useSourceDirty(source: SourceId): number {
  const drafts = useDrafts();
  const [count, setCount] = useState(() => drafts.dirtyOn(source).length);
  useEffect(() => {
    const read = () => setCount(drafts.dirtyOn(source).length);
    read();
    return drafts.subscribe(read);
  }, [drafts, source]);
  return count;
}
