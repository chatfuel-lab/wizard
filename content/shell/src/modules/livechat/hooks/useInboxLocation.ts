import { useEffect, useState } from 'react';

export interface InboxLocation {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  /** The `contact` deep-link param — an instruction, consumed once, not a state. */
  startWithContact: string | null;
}

/**
 * The inbox's deep-link params: `c` (the open conversation) and `contact`
 * (start a conversation with this contact) — both read once at mount, with
 * the selection written back so the link stays shareable.
 */
export function useInboxLocation(params: URLSearchParams, setParams: (next: URLSearchParams) => void): InboxLocation {
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('c'));
  const [startWithContact] = useState<string | null>(() => params.get('contact'));

  // Keep the deep link shareable (params are read once at mount; the shell
  // remounts this component on module/bot switches).
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (selectedId) next.set('c', selectedId);
    else next.delete('c');
    next.delete('contact');
    if (next.toString() !== params.toString()) setParams(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return { selectedId, setSelectedId, startWithContact };
}
