import { useEffect, useState } from 'react';
import { useDrafts } from '../AutomationsDraftContext';

/** The number of dirty drafts, re-rendered when the registry changes. */
export function useDraftCount(): number {
  const drafts = useDrafts();
  const [count, setCount] = useState(() => drafts.dirtyCount());
  useEffect(() => drafts.subscribe(() => setCount(drafts.dirtyCount())), [drafts]);
  return count;
}
