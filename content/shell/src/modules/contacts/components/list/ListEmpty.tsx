import type { ReactNode } from 'react';
import { Button, EmptyState, IconContacts, IconFilter, IconLock } from '~ui';
import type { EmptyKind } from '../../lib/tableSelection';

export interface ListEmptyProps {
  kind: EmptyKind;
  canEdit: boolean;
  onClearFilters: () => void;
  onNewContact: () => void;
  /** The import track's button, rendered inside the "no contacts yet" state. */
  importSlot?: ReactNode;
}

/**
 * Three empty tables that look the same and mean different things.
 *
 * Which one is `emptyKind`'s decision, in `lib/tableSelection.ts`, so it can be
 * asserted without a render. This file only says the words.
 *
 * The restricted case deliberately offers no action at all: no filter change
 * and no import would help, and a button that cannot work is worse than none.
 */
export function ListEmpty({ kind, canEdit, onClearFilters, onNewContact, importSlot }: ListEmptyProps) {
  if (kind === 'restricted') {
    return (
      <EmptyState
        icon={<IconLock />}
        title="Your role hides these contacts"
        description="This bot has contacts, but the People permission on your role does not cover them. An admin can widen it."
      />
    );
  }

  if (kind === 'filtered') {
    return (
      <EmptyState
        icon={<IconFilter />}
        title="Nothing matches this filter"
        description="Widen it, or clear it to see the whole address book again."
        action={
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<IconContacts />}
      title="No contacts yet"
      description="Import a CSV, or add a WhatsApp contact by hand. Contacts also appear here on their own the first time someone messages the bot."
      action={
        canEdit ? (
          <span className="flex flex-wrap items-center justify-center gap-2">
            {importSlot}
            <Button variant="secondary" size="sm" onClick={onNewContact}>
              New WhatsApp contact
            </Button>
          </span>
        ) : undefined
      }
    />
  );
}
