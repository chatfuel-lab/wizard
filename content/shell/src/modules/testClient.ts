import type { ModuleClient } from '~api';

/**
 * An inert client for the render smoke tests.
 *
 * The suites that use it render a module tree to a string, where effects never
 * run — so nothing is ever fetched and the data a client would carry does not
 * matter. What matters is that the module has A client: the shape it destructures,
 * passes into its context and hands to its stores. This is that shape and nothing
 * else, which is why a request made from it never answers rather than answering
 * with a lie: a test that starts depending on the reply is a test that has left
 * the frame and needs a real double of its own.
 *
 * It sits beside `types.ts`, `shellApi.ts` and `shellConfig.ts` because a module
 * may import those files and nothing else outside its own subtree, and twelve
 * copies of the same ten lines is not a boundary worth keeping.
 */
export function createTestClient(): ModuleClient {
  const pending = <T>(): Promise<T> => new Promise<T>(() => undefined);
  return {
    query: () => pending(),
    mutate: () => pending(),
    subscribe: () => () => undefined,
    onReconnect: () => () => undefined,
  };
}
