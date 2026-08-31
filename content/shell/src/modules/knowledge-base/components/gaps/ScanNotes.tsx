import { Alert } from '~ui';
import { MAX_CONTACTS, MAX_CONVERSATIONS } from '../../lib/gapScanPolicy';

export interface ScanNotesProps {
  stopped: boolean;
  swept: number;
  read: number;
  flagged: number;
  contactCap: boolean;
  conversationCap: boolean;
}

/**
 * The footnotes under a finished sweep.
 *
 * They are not decoration: every one of them is a reason the count above is a
 * floor rather than a total, and a reader who acts on "three people asked this"
 * deserves to know that the fourth was out of reach.
 */
export function ScanNotes({ stopped, swept, read, flagged, contactCap, conversationCap }: ScanNotesProps) {
  const notes: string[] = [];
  if (stopped) notes.push(`You stopped the scan after ${swept} chats and ${read} conversations.`);
  if (conversationCap)
    notes.push(`${flagged} chats were handed over and the ${MAX_CONVERSATIONS} most recent of them were read.`);
  if (contactCap && !stopped)
    notes.push(`The sweep stops at the ${MAX_CONTACTS} most recent chats; anything older was not looked at.`);
  notes.push(
    'A hand-off a teammate opened before this ran no longer carries the flag, so it is invisible here unless they are still assigned to it.',
  );

  return (
    <Alert tone="info" title="What this list is">
      <ul className="flex flex-col gap-1">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </Alert>
  );
}
