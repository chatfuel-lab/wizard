import { UserStorageGetDocument, UserStorageSetDocument } from './generated/core/graphql';
import type { TypedDoc } from './module-client';

/**
 * The only persistence the Chatfuel API offers a client:
 * `currentUser.userStorageItem` / `setUserStorageItem` — an arbitrary id
 * holding an arbitrary string, scoped to the SIGNED-IN USER. There is no team
 * scope and no sharing: a colleague opening the same bot reads their own
 * items, never these.
 *
 * This factory binds one id and hands back the two calls every consumer
 * repeats. An id that was never written reads back as an item with
 * `value: null`, not as an error — a first-time user simply gets nothing.
 */

/** The two calls this file needs from a client — the full module client satisfies it. */
export interface UserStorageClient {
  query<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars): Promise<TData>;
  mutate<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars): Promise<TData>;
}

/** One stored string under one id: read it back, or replace it whole. */
export interface UserTextStore {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

export function createUserStorage(client: UserStorageClient, id: string): UserTextStore {
  return {
    async read() {
      const data = await client.query(UserStorageGetDocument, { id });
      return data.currentUser.userStorageItem?.value ?? null;
    },
    async write(value: string) {
      await client.mutate(UserStorageSetDocument, { id, value });
    },
  };
}
