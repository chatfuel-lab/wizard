import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import type { RequestOptions } from './client';
import type { UploadFileFn } from './upload';

/**
 * A generated operation with its result and variable types attached. This is
 * the ancestor both codegen shapes share — TypedDocumentNode (an AST) and
 * TypedDocumentString (printed text) — and the only thing the client ever
 * needs from a document is those two phantom types: what it sends is worked
 * out by the transport. Naming the ancestor here keeps modules from ever
 * importing the codegen package themselves, and means the generated shape can
 * change again without a signature moving.
 */
export type TypedDoc<TData, TVars> = DocumentTypeDecoration<TData, TVars>;

/**
 * Structural client surface a module UI needs. Module roots receive it via
 * props (embed-safe) and never construct one; the host app's client factory is
 * the only place that knows about tokens and proxies.
 */
export interface ModuleClient {
  query<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars, opts?: RequestOptions): Promise<TData>;
  mutate<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars, opts?: RequestOptions): Promise<TData>;
  subscribe<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    observer: {
      next: (data: TData) => void;
      error?: (err: unknown) => void;
      complete?: () => void;
    },
  ): () => void;
  onReconnect(cb: () => void): () => void;
  /**
   * REST file upload — attached by the host's client factory when an upload
   * path exists (dev proxy /chatfuel/api). Modules hide upload UI when absent.
   */
  uploadFile?: UploadFileFn;
  /**
   * An authenticated call to one of the proxy's own routes — NOT to Chatfuel.
   *
   * `path` is relative to the proxy prefix ('/instagram/posts'), because where
   * the proxy is mounted is the host's business and an embed may mount it
   * anywhere. The host resolves the prefix and adds the caller's session bearer,
   * exactly as it already does for `uploadFile`.
   *
   * Absent when there is no proxy in front of the app at all (a host talking
   * to Chatfuel directly). Present does NOT mean a given route
   * exists: whether the proxy mounts a module's routes depends on how it was
   * configured, and the answer to that is the 404 the route itself gives. A
   * module that keeps server-side state offers that half of itself when its own
   * route answers and does without when it does not — it never asks which
   * modules the deployment installed.
   */
  proxyFetch?: (path: string, init?: RequestInit) => Promise<Response>;
}
