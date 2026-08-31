import { describe, expect, it } from 'vitest';
import { HEALTH_PATH, PATH_PARAM, PUBLIC_PREFIX, restoreUrl } from './chatfuel';

/**
 * The one thing this file adds on top of the proxy core: the path the function
 * sees is not the path the browser asked for. Vercel's zero-config `api/`
 * directory cannot route a multi-segment path to a catch-all filename, so
 * vercel.json sends every /chatfuel/* request to one static function and the
 * real path rides along in a query parameter. Getting that wrong 404s the auth
 * routes and the file uploads while GraphQL keeps working — a failure that
 * looks like "sign-up is broken" rather than "routing is broken".
 */
describe('restoreUrl', () => {
  it('rebuilds a single-segment path', () => {
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=graphql`)).toBe('/chatfuel/graphql');
  });

  it('rebuilds a multi-segment path — the whole reason this parameter exists', () => {
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=auth/provision`)).toBe('/chatfuel/auth/provision');
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=api/filestorage/upload/bot`)).toBe(
      '/chatfuel/api/filestorage/upload/bot',
    );
  });

  it('keeps the caller’s own query and drops only the routing parameter', () => {
    // The REST fence reads botID off the query string; losing it would open it.
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=api/filestorage/upload/bot&botID=b1&fileType=Image`)).toBe(
      '/chatfuel/api/filestorage/upload/bot?botID=b1&fileType=Image',
    );
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=graphql&op=BotsList`)).toBe('/chatfuel/graphql?op=BotsList');
  });

  it('passes an unrewritten request through untouched', () => {
    expect(restoreUrl('/chatfuel/graphql')).toBe('/chatfuel/graphql');
    expect(restoreUrl('/chatfuel/graphql?op=X')).toBe('/chatfuel/graphql?op=X');
    expect(restoreUrl(undefined)).toBe('/');
  });

  it('routes the health check through the same rewrite', () => {
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=healthz`)).toBe(HEALTH_PATH);
    expect(HEALTH_PATH.startsWith(PUBLIC_PREFIX)).toBe(true);
  });

  /*
   * `/api/chatfuel` answers direct calls too, so the parameter is the caller's
   * to write. Everything below is a shape Vercel's rewrite cannot produce, and
   * refusing it keeps the string the core routes on one this file built.
   */
  it('refuses the routing parameter written twice', () => {
    // `get` takes the first, an upstream reading the last acts on the other one.
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=graphql&${PATH_PARAM}=auth/provision`)).toBeNull();
  });

  it('refuses a value that is not one path under the public prefix', () => {
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=../admin/session`)).toBeNull();
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=auth/../../admin`)).toBeNull();
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=./graphql`)).toBeNull();
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=/graphql`)).toBeNull();
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=graphql%3Fop%3DX`)).toBeNull();
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=graphql%23x`)).toBeNull();
  });

  it('refuses a dot-dot that only appears once the value is decoded', () => {
    // %2e%2e is the same segment written so a substring check misses it.
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=%2e%2e/admin`)).toBeNull();
  });

  it('re-encodes what survives, so the core parses a string this file wrote', () => {
    expect(restoreUrl(`/api/chatfuel?${PATH_PARAM}=api/filestorage/a b`)).toBe('/chatfuel/api/filestorage/a%20b');
  });
});
