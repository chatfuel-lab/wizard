import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface ContactsContextValue {
  client: ApiClient;
  botId: string;
}

export const ContactsContext = createContext<ContactsContextValue | null>(null);

export function useContacts(): ContactsContextValue {
  const value = useContext(ContactsContext);
  if (!value) throw new Error('useContacts must be used inside <ContactsApp>');
  return value;
}
