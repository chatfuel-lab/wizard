import { ChatfuelApiError, ChatfuelHttpError, ChatfuelNetworkError } from './errors';
import { readTextCapped } from './readBody';
import { requirePositiveMs } from './transport/http';
import { assertCredentialSafeUrl } from './urlGuard';

/**
 * REST file upload (files-tasks.md): GraphQL never accepts file bytes — the
 * upload endpoint returns a FileID that mutations then reference (goods
 * images, CSV imports, specialist avatars).
 *
 * POST {basePath}/filestorage/upload/bot?fileType=…&botID=… with a multipart
 * "file" field. The Chatfuel Authorization is injected server-side by the proxy
 * (cors-proxy.md shape A) — the browser never sees that token; the only header
 * this helper may add is the caller's own session bearer for the proxy gate.
 */

export type UploadFileType = 'Image' | 'Video' | 'Audio' | 'Document';

export interface UploadedFile {
  id: string;
  url?: string;
}

/**
 * The shape host apps attach to ModuleClient.uploadFile. The optional
 * pluginId switches to the PLUGIN upload endpoint — flow-builder media
 * attaches files to a block element (pluginID = blockElementID); uploads
 * stay temporary until an attach mutation references the returned FileID.
 */
export type UploadFileFn = (
  botId: string,
  file: File | Blob,
  fileType: UploadFileType,
  pluginId?: string,
) => Promise<UploadedFile>;

export interface UploadFileOptions {
  botId: string;
  file: File | Blob;
  fileType: UploadFileType;
  /** Upload target: the plugin endpoint with pluginID=<blockElementID>. */
  pluginId?: string;
  /** REST prefix the dev proxy forwards to {upstream}/api/* . */
  basePath?: string;
  /**
   * The origin the client this upload belongs to sends credentials to
   * (`credentialOrigin` of its `url`). `basePath` is a knob of its own, and
   * this is what keeps it pointing at the same proxy as everything else.
   */
  pinnedOrigin?: string;
  fetchImpl?: typeof fetch;
  /**
   * Behind the proxy gate (auth module): the caller's session bearer
   * ("Bearer <supabase jwt>") so the REST passthrough can gate it too. The
   * proxy strips it before forwarding upstream. Undefined = no header.
   */
  getAuthHeader?: () => string | undefined | Promise<string | undefined>;
  /** Overrides the budget derived from the file's size. */
  timeoutMs?: number;
}

/**
 * How long an upload may take before it is given up on.
 *
 * Everything else that talks to the network here has a budget — the GraphQL
 * transport 30 s, the proxy's own Supabase calls 10 s and 30 s — and this had
 * none, so a connection that stalled left the upload spinning in the UI with no
 * path out for the person watching it.
 *
 * A flat number is the wrong shape for this one: the thirty seconds that is
 * generous for a query is not enough for a 25 MiB video on a phone. So the
 * budget is a floor plus an allowance per megabyte, and a ceiling over both, so
 * that a `size` this code was lied to about cannot mean "forever" either.
 */
const UPLOAD_TIMEOUT_FLOOR_MS = 30_000;
const UPLOAD_TIMEOUT_PER_MIB_MS = 20_000;
const UPLOAD_TIMEOUT_CEILING_MS = 10 * 60_000;

/**
 * The answer is a small JSON object holding a file id. Nothing legitimate
 * about this endpoint needs a megabyte, so the cap is far below the GraphQL
 * transport's and still leaves room for an error page.
 */
const UPLOAD_MAX_RESPONSE_BYTES = 1024 * 1024;

export function uploadTimeoutMs(bytes: number): number {
  const size = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const budget = UPLOAD_TIMEOUT_FLOOR_MS + (size / (1024 * 1024)) * UPLOAD_TIMEOUT_PER_MIB_MS;
  return Math.min(Math.round(budget), UPLOAD_TIMEOUT_CEILING_MS);
}

/**
 * Non-2xx responses throw ChatfuelHttpError — the body snippet carries the
 * platform error code (FileTooBig, FileContentTypeNotSupported) for the UI
 * to match on.
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadedFile> {
  const { botId, file, fileType, pluginId, basePath = '/chatfuel/api', fetchImpl = fetch } = options;
  const url = pluginId
    ? `${basePath}/filestorage/upload/plugin` +
      `?fileType=${encodeURIComponent(fileType)}&botID=${encodeURIComponent(botId)}` +
      `&pluginID=${encodeURIComponent(pluginId)}`
    : `${basePath}/filestorage/upload/bot` +
      `?fileType=${encodeURIComponent(fileType)}&botID=${encodeURIComponent(botId)}`;
  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  const auth = await options.getAuthHeader?.();
  // Checked only once a bearer actually resolved: an unauthenticated upload
  // over plain http is the host's business, one carrying a session token is
  // this helper's. `basePath` is relative by default, which the guard exempts.
  if (auth) {
    assertCredentialSafeUrl(url, 'basePath', options.pinnedOrigin);
    headers.authorization = auth;
  }
  const timeoutMs =
    options.timeoutMs === undefined
      ? uploadTimeoutMs(file.size)
      : requirePositiveMs(options.timeoutMs, 'UploadFileOptions.timeoutMs');
  let response: Response;
  let body: string;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      body: form,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Inside the try with the request: the budget covers reading the answer
    // too, and a stall there is the same failure as a stall before it.
    body = await readTextCapped(response, UPLOAD_MAX_RESPONSE_BYTES, 'File upload');
  } catch (err) {
    // An over-cap body already reached the server and says so itself; only a
    // fetch-level failure gets retold as one of the two below.
    if (err instanceof ChatfuelNetworkError) throw err;
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    throw new ChatfuelNetworkError(
      timedOut
        ? `File upload gave up after ${Math.round(timeoutMs / 1000)}s with no answer from the server`
        : 'File upload failed before reaching the server',
      { cause: err },
    );
  }
  if (!response.ok) throw new ChatfuelHttpError(response.status, body);

  const uploaded = extractUploadedFile(body);
  if (!uploaded) {
    // The body is left out for the reason ChatfuelHttpError leaves it out: it
    // is somebody else's payload and this message is rendered and logged. Its
    // length is enough to tell an empty answer from an unexpected one.
    throw new ChatfuelApiError(
      `File upload succeeded but the response carried no file id (${body.length} bytes of body)`,
    );
  }
  return uploaded;
}

/**
 * The upload endpoint's response key is not pinned by the docs — tolerate
 * {id} / {fileID} / {fileId}, at the top level or one level down.
 */
function extractUploadedFile(body: string): UploadedFile | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const candidates: unknown[] = [parsed];
  if (parsed && typeof parsed === 'object') {
    for (const key of ['file', 'result', 'data']) {
      const nested = (parsed as Record<string, unknown>)[key];
      if (nested && typeof nested === 'object') candidates.push(nested);
    }
  }
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const record = candidate as Record<string, unknown>;
    const id = record.id ?? record.fileID ?? record.fileId;
    if (typeof id === 'string' && id) {
      return { id, url: typeof record.url === 'string' ? record.url : undefined };
    }
  }
  return null;
}
