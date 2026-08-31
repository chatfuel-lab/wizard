import { describe, expect, it } from 'vitest';
import { getDocMeta } from '../src/transport/http';
import type { TypedDoc } from '../src/module-client';
import { createUserStorage, type UserStorageClient } from '../src/userStorage';

interface Call {
  operation: string | undefined;
  variables: unknown;
}

/** One in-memory item per id, answering the way the API does: never-written reads as `value: null`. */
function fakeClient(items: Map<string, string>) {
  const calls: Call[] = [];
  const client: UserStorageClient = {
    query: <TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars) => {
      calls.push({ operation: getDocMeta(doc).name, variables });
      const { id } = variables as { id: string };
      return Promise.resolve({
        currentUser: { id: 'u1', userStorageItem: { id, value: items.get(id) ?? null } },
      } as TData);
    },
    mutate: <TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars) => {
      calls.push({ operation: getDocMeta(doc).name, variables });
      const { id, value } = variables as { id: string; value: string };
      items.set(id, value);
      return Promise.resolve({ setUserStorageItem: { id, value } } as TData);
    },
  };
  return { client, calls };
}

describe('createUserStorage', () => {
  it('reads an id that was never written as null, not as an error', async () => {
    const { client } = fakeClient(new Map());
    await expect(createUserStorage(client, 'app.key.v1').read()).resolves.toBeNull();
  });

  it('round-trips one string under the bound id', async () => {
    const items = new Map<string, string>();
    const { client, calls } = fakeClient(items);
    const store = createUserStorage(client, 'app.key.v1');

    await store.write('{"views":[]}');
    await expect(store.read()).resolves.toBe('{"views":[]}');
    expect(items.get('app.key.v1')).toBe('{"views":[]}');
    expect(calls.map((call) => call.operation)).toEqual(['UserStorageSet', 'UserStorageGet']);
    expect(calls[0]?.variables).toEqual({ id: 'app.key.v1', value: '{"views":[]}' });
  });

  it('keeps two ids apart — each store touches only the id it was built with', async () => {
    const items = new Map<string, string>();
    const { client } = fakeClient(items);
    await createUserStorage(client, 'a').write('for a');
    await expect(createUserStorage(client, 'b').read()).resolves.toBeNull();
  });
});
