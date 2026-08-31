/**
 * Minimal production stand-in: one node:http server answering POST /graphql
 * with a scripted envelope and speaking just enough graphql-transport-ws on
 * WS upgrades to /graphql (init/ack, subscribe → two `next` frames, ping/pong).
 *
 * Three operations answer themselves rather than from the scripted envelope,
 * because the proxy reads their results: the two provisioning mutations, and
 * the account tree the deployment fence asks for. Fence calls are counted in
 * `fenceRequests` and kept OUT of `httpRequests` — they are the proxy's own
 * bookkeeping, not traffic a client sent, and counting them as such would make
 * every "was this forwarded?" assertion depend on cache timing.
 */
import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

export interface RecordedHttpRequest {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export interface MockUpstream {
  url: string;
  httpRequests: RecordedHttpRequest[];
  /** How many times the deployment fence asked for the account tree. */
  readonly fenceRequests: number;
  /**
   * What the fence is told the account holds. `null` answers with an error
   * envelope instead — the "Chatfuel could not be asked" case.
   */
  setWorkspaces(workspaces: Array<{ id: string; bots: string[] }> | null): void;
  /**
   * Hold every workspaceCreateBot answer until the returned release is called.
   * The only way to get two provisioning requests genuinely in flight at once:
   * `respondAfter` delays the scripted envelope, and this mutation answers
   * itself above it.
   */
  holdCreateBot(): () => void;
  /** How many workspaceCreateBot requests ARRIVED (held ones included). */
  readonly createsStarted: number;
  /** How many bots the bot routes asked for / rolled back / renamed. `botsCreated` counts ANSWERS. */
  readonly botsCreated: number;
  readonly botsDeleted: number;
  readonly botsRenamed: number;
  /** Variables of the last workspaceCreateBot — the workspace it billed to. */
  readonly lastCreateVariables: Record<string, unknown> | undefined;
  /**
   * Answer workspaceCreateBot with a Chatfuel domain failure instead of a bot.
   * The envelope matches upstream's: the error arrives nested, so the code
   * lives two `extensions` deep.
   */
  failCreateWith(code: string | null): void;
  /** Answer renameBot with a failure, to exercise the put-the-name-back path. */
  failRename(value: boolean): void;
  /**
   * Answer deleteBot with a Chatfuel domain failure. `NotEnoughPermissions` is
   * what a bot that is ALREADY deleted answers with, so it is the interesting
   * one.
   */
  failDeleteWith(code: string | null): void;
  initPayloads: unknown[];
  /** Every text frame the upstream socket received, raw — what the relay let through. */
  wsFrames: string[];
  readonly wsConnections: number;
  respondWith(status: number, body: unknown): void;
  /** Hold every HTTP answer back by this long, to exercise the proxy's budgets. */
  respondAfter(ms: number): void;
  failNextInitWith(code: number, reason: string): void;
  /**
   * Answer the next `subscribe` with this frame instead of the two `next`
   * frames — the only way to make the upstream socket say something the relay
   * has to rewrite on its way out. The subscription's own id is filled in.
   */
  answerNextSubscribeWith(frame: { type: string; payload: unknown }): void;
  killAllSockets(): void;
  close(): Promise<void>;
}

export async function startMockUpstream(): Promise<MockUpstream> {
  let responseStatus = 200;
  let responseBody: unknown = { data: { ok: true } };
  let responseDelayMs = 0;
  let failInit: { code: number; reason: string } | undefined;
  let nextSubscribeFrame: { type: string; payload: unknown } | undefined;
  const httpRequests: RecordedHttpRequest[] = [];
  const initPayloads: unknown[] = [];
  const wsFrames: string[] = [];
  const sockets = new Set<WebSocket>();
  let wsConnections = 0;
  let botsCreated = 0;
  let botsDeleted = 0;
  let botsRenamed = 0;
  let lastCreateVariables: Record<string, unknown> | undefined;
  let createFailureCode: string | null = null;
  /** Non-null while `holdCreateBot` is on: the answers waiting for release. */
  let heldCreates: (() => void)[] | null = null;
  let createsStarted = 0;
  let renameFails = false;
  let deleteFailureCode: string | null = null;
  let fenceRequests = 0;
  // The deployer's account, as the rest of this suite imagines it: every bot
  // the tests name as legitimate lives in it. 'bot-foreign' deliberately does not.
  let workspaces: Array<{ id: string; bots: string[] }> | null = [
    { id: 'ws-1', bots: ['b1', 'bot-owner', 'bot-colleague'] },
  ];

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (raw.includes('CfWorkspaceBots')) {
        fenceRequests += 1;
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify(
            workspaces
              ? {
                  data: {
                    currentUser: {
                      id: 'account',
                      workspaces: workspaces.map((w) => ({
                        id: w.id,
                        bots: w.bots.map((id) => ({ id })),
                      })),
                    },
                  },
                }
              : { data: null, errors: [{ message: 'nope', extensions: { code: 'X' } }] },
          ),
        );
        return;
      }
      /* The admin panel's own reads, answered from the same account tree the
         fence is drawn from and kept out of httpRequests for the same reason:
         they are the panel's bookkeeping, not traffic a client sent. */
      if (raw.includes('CfAdminPing')) {
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ data: { currentUser: { id: 'account', name: 'Test Account', email: null } } }));
        return;
      }
      if (raw.includes('CfAdminOverview')) {
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        /* `null` workspaces is "Chatfuel could not be asked", exactly as the
           fence branch above reads it — an empty account answers with []. */
        res.end(
          JSON.stringify(
            workspaces
              ? {
                  data: {
                    currentUser: {
                      id: 'account',
                      name: 'Test Account',
                      email: 'ops@example.com',
                      workspaces: workspaces.map((w) => ({
                        id: w.id,
                        title: w.id,
                        botsLimit: 3,
                        bots: w.bots.map((id) => ({ id, title: id })),
                      })),
                    },
                  },
                }
              : { data: null, errors: [{ message: 'nope', extensions: { code: 'X' } }] },
          ),
        );
        return;
      }
      if (raw.includes('CfAdminWorkspaceBilling')) {
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            data: {
              currentUser: {
                id: 'account',
                workspace: { id: 'ws-1', subscription: { id: 'sub-1', status: 'Active', isOnTrialPeriod: false } },
              },
            },
          }),
        );
        return;
      }
      if (raw.includes('CfAdminWorkspace')) {
        const wanted = (workspaces ?? []).find((w) => raw.includes(w.id));
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            data: {
              currentUser: {
                id: 'account',
                workspace: wanted
                  ? {
                      id: wanted.id,
                      title: wanted.id,
                      botsLimit: 3,
                      bots: wanted.bots.map((id) => ({ id, title: id })),
                    }
                  : null,
              },
            },
          }),
        );
        return;
      }
      if (raw.includes('CfAdminBot')) {
        const owner = (workspaces ?? []).find((w) => w.bots.some((id) => raw.includes(id)));
        const botId = owner?.bots.find((id) => raw.includes(id));
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            data: {
              bot: botId
                ? {
                    id: botId,
                    title: botId,
                    createdAt: '2026-01-01T00:00:00Z',
                    isReady: true,
                    countryCode: 'GB',
                    timezone: 'Europe/London',
                    industry: null,
                    workspace: { id: owner!.id, title: owner!.id },
                    contactScopes: [],
                    members: [],
                  }
                : null,
              currentUser: {
                id: 'account',
                botRole: { roleTypeV2: 'Admin', botPermissions: [{ object: 'Bot', action: 'Edit' }] },
              },
            },
          }),
        );
        return;
      }
      httpRequests.push({
        url: req.url ?? '',
        method: req.method ?? '',
        headers: req.headers,
        body: raw,
      });
      res.statusCode = responseStatus;
      res.setHeader('content-type', 'application/json');
      // The bot mutations answer themselves: the routes read the result out of
      // the envelope, so a canned `{ ok: true }` would make every one of them
      // look like a Chatfuel failure.
      let query: string;
      let variables: Record<string, unknown> | undefined;
      try {
        // REST uploads are not JSON — a throw here would hang the response.
        const parsed = JSON.parse(raw || '{}') as {
          query?: unknown;
          variables?: unknown;
        };
        query = String(parsed.query ?? '');
        variables = (parsed.variables ?? undefined) as Record<string, unknown> | undefined;
      } catch {
        query = '';
      }
      if (query.includes('workspaceCreateBot')) {
        lastCreateVariables = variables;
        createsStarted += 1;
        /* Everything about the answer — including whether it fails — is decided
           at RELEASE time, so a test can hold two requests open, set the
           outcome, and let both go. `botsCreated` therefore counts answers,
           not arrivals; `createsStarted` counts arrivals. */
        const answer = () => {
          if (createFailureCode) {
            res.end(
              JSON.stringify({
                errors: [
                  {
                    message: "Failed to fetch from Subgraph 'upstream'.",
                    extensions: {
                      errors: [
                        {
                          message: 'service error',
                          path: ['workspaceCreateBot'],
                          extensions: { code: createFailureCode, service: 'upstream' },
                        },
                      ],
                      serviceName: 'upstream',
                    },
                  },
                ],
                data: null,
              }),
            );
            return;
          }
          botsCreated += 1;
          res.end(JSON.stringify({ data: { workspaceCreateBot: { id: `bot-new-${botsCreated}` } } }));
        };
        if (heldCreates) heldCreates.push(answer);
        else answer();
        return;
      }
      if (query.includes('deleteBot')) {
        if (deleteFailureCode) {
          res.end(
            JSON.stringify({
              errors: [
                {
                  message: "Failed to fetch from Subgraph 'upstream'.",
                  extensions: {
                    errors: [
                      {
                        message: 'auth error',
                        path: ['deleteBot'],
                        extensions: { code: deleteFailureCode, service: 'upstream' },
                      },
                    ],
                    serviceName: 'upstream',
                  },
                },
              ],
              data: null,
            }),
          );
          return;
        }
        botsDeleted += 1;
        res.end(JSON.stringify({ data: { deleteBot: { id: 'account' } } }));
        return;
      }
      if (query.includes('renameBot')) {
        if (renameFails) {
          res.end(JSON.stringify({ data: null, errors: [{ message: 'rename refused' }] }));
          return;
        }
        botsRenamed += 1;
        res.end(JSON.stringify({ data: { renameBot: { id: String(variables?.botID ?? '') } } }));
        return;
      }
      if (responseDelayMs > 0) {
        setTimeout(() => res.end(JSON.stringify(responseBody)), responseDelayMs);
        return;
      }
      res.end(JSON.stringify(responseBody));
    });
  });

  const wss = new WebSocketServer({
    server,
    path: '/graphql',
    handleProtocols: (protocols) => (protocols.has('graphql-transport-ws') ? 'graphql-transport-ws' : false),
  });

  wss.on('connection', (ws) => {
    wsConnections += 1;
    sockets.add(ws);
    ws.on('close', () => sockets.delete(ws));
    ws.on('message', (data) => {
      wsFrames.push(String(data));
      let msg: { type?: string; id?: string; payload?: unknown };
      try {
        msg = JSON.parse(String(data)) as typeof msg;
      } catch {
        return;
      }
      if (msg.type === 'connection_init') {
        initPayloads.push(msg.payload);
        if (failInit) {
          ws.close(failInit.code, failInit.reason);
          failInit = undefined;
          return;
        }
        ws.send(JSON.stringify({ type: 'connection_ack' }));
      } else if (msg.type === 'subscribe') {
        if (nextSubscribeFrame) {
          ws.send(JSON.stringify({ id: msg.id, ...nextSubscribeFrame }));
          nextSubscribeFrame = undefined;
          return;
        }
        ws.send(JSON.stringify({ id: msg.id, type: 'next', payload: { data: { unseenOpenDialogsCountChanged: 1 } } }));
        ws.send(JSON.stringify({ id: msg.id, type: 'next', payload: { data: { unseenOpenDialogsCountChanged: 2 } } }));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    httpRequests,
    wsFrames,
    get fenceRequests() {
      return fenceRequests;
    },
    setWorkspaces(next) {
      workspaces = next;
      fenceRequests = 0;
    },
    get botsCreated() {
      return botsCreated;
    },
    get botsDeleted() {
      return botsDeleted;
    },
    get botsRenamed() {
      return botsRenamed;
    },
    get lastCreateVariables() {
      return lastCreateVariables;
    },
    failCreateWith(code) {
      createFailureCode = code;
    },
    failRename(value) {
      renameFails = value;
    },
    failDeleteWith(code) {
      deleteFailureCode = code;
    },
    initPayloads,
    get wsConnections() {
      return wsConnections;
    },
    holdCreateBot() {
      heldCreates = [];
      return () => {
        const queued = heldCreates ?? [];
        heldCreates = null;
        for (const answer of queued) answer();
      };
    },
    get createsStarted() {
      return createsStarted;
    },
    respondWith(status, body) {
      responseStatus = status;
      responseBody = body;
    },
    respondAfter(ms) {
      responseDelayMs = ms;
    },
    failNextInitWith(code, reason) {
      failInit = { code, reason };
    },
    answerNextSubscribeWith(frame) {
      nextSubscribeFrame = frame;
    },
    killAllSockets() {
      for (const ws of sockets) ws.terminate();
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const ws of sockets) ws.terminate();
        wss.close();
        server.close(() => resolve());
      }),
  };
}
