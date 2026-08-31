import type { ModuleClient } from '~api';
import type { ContactGetQuery, ContactsRowsQuery, ContactsTeamQuery } from '~api/generated/contacts/graphql';

export type ApiClient = ModuleClient;

/**
 * Every domain type is derived from codegen rather than hand-written, so a
 * change to the operation is a type error here instead of a runtime surprise.
 *
 * A row and a record are the same contact seen twice: the row asks only for
 * the attributes the visible columns need, the record asks for all of them.
 */
export type ContactRow = ContactsRowsQuery['bot']['contactsConnection']['edges'][number]['node'];
export type ContactRecord = ContactGetQuery['bot']['contact'];
export type AttributeEntry = ContactRow['attributes'][number];
export type TeamMember = ContactsTeamQuery['bot']['members'][number];

/**
 * A contact the caller may not see. Every field is empty, so nothing may be
 * read off it and nothing may be written to it — the table shows a lock.
 */
export const isRestricted = (contact: { __typename: string }): boolean => contact.__typename === 'UnavailableContact';

/** The phone a WhatsApp contact carries; null on every other platform. */
export function phoneOf(contact: ContactRow | ContactRecord): string | null {
  return 'phone' in contact && typeof contact.phone === 'string' ? contact.phone : null;
}

/** The @handle Instagram and TikTok contacts carry. */
export function usernameOf(contact: ContactRow | ContactRecord): string | null {
  return 'username' in contact && typeof contact.username === 'string' ? contact.username : null;
}
