/**
 * Live verification against PRODUCTION through the Vite dev-server relay.
 * Boots a bare vite dev server (no app files) with the proxy
 * plugin and drives a TOKENLESS api-client through it:
 *   (a) HTTP CurrentUser + BotsList via /chatfuel/graphql
 *   (b) WS UnseenOpenDialogsCountChanged subscription via the relay
 *   (--send --contact <id>) CreateConversation + messageAdded echo of SendWidgetText
 *
 * ⚠ `--send` writes to your live Chatfuel account (creates a conversation and
 *   sends a message). Omit it for read-only checks.
 *
 * Run: pnpm --filter @chatfuel/vite-plugin-proxy live-check [-- --bot <id> --contact <id> --send]
 * Requires CHATFUEL_TOKEN in the repo-root .env (the PROXY reads it; the client gets no token).
 */
import { WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { createChatfuelClient, newClientId } from '@chatfuel/api-client';
import { BotsListDocument, CurrentUserDocument } from '@chatfuel/api-client/generated/core';
import {
  CreateConversationDocument,
  MessageAddedDocument,
  SendWidgetTextDocument,
  UnseenOpenDialogsCountChangedDocument,
} from '@chatfuel/api-client/generated/livechat';
import { chatfuelProxy } from '../src/vite';

// The token's shape is not guaranteed, so mask both the legacy 64-hex form and
// the literal value once main() has read it.
const secrets: string[] = [];
const maskSecrets = (text: string): string => {
  let out = text.replace(/[0-9a-f]{64}/gi, '[chatfuel-token]');
  for (const secret of secrets) out = out.split(secret).join('[chatfuel-token]');
  return out;
};
for (const stream of [process.stdout, process.stderr] as const) {
  const original = stream.write.bind(stream);
  stream.write = ((chunk: string | Uint8Array, ...rest: never[]) =>
    original(maskSecrets(String(chunk)), ...rest)) as typeof stream.write;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const pass = (msg: string) => console.log(`PASS  ${msg}`);
const fail = (msg: string) => {
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
};

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${what}`)), ms)),
  ]);
}

async function main(): Promise<void> {
  const token = process.env.CHATFUEL_TOKEN?.trim();
  if (!token || /\s/.test(token)) {
    fail('CHATFUEL_TOKEN missing or malformed (put the token from the Chatfuel token page in the repo-root .env)');
    return;
  }
  secrets.push(token);

  const vite = await createViteServer({
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [chatfuelProxy({ token })],
  });
  await vite.listen();
  const address = vite.httpServer?.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  console.log(`      vite dev server on 127.0.0.1:${port}, relaying to production`);

  // Deliberately NO token on the client — the relay must inject everything.
  const client = createChatfuelClient({
    url: `http://127.0.0.1:${port}/chatfuel/graphql`,
    wsUrl: `ws://127.0.0.1:${port}/chatfuel/graphql`,
    webSocketImpl: WebSocket,
  });

  try {
    const user = await client.query(CurrentUserDocument, {});
    pass(`HTTP via proxy: CurrentUser id=${user.currentUser?.id ?? '?'}`);

    const bots = await client.query(BotsListDocument, { first: 25 });
    const list = (bots.currentUser?.botsV2?.edges ?? []).flatMap((e) => (e?.node ? [e.node] : []));
    pass(`HTTP via proxy: BotsList ${list.length} bot(s)`);

    const botID = arg('bot') ?? list[0]?.id;
    if (!botID) {
      fail('no bot available (pass --bot <id>)');
      return;
    }
    console.log(`      using bot ${botID}`);

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = (ok: boolean, msg: string) => {
        if (settled) return;
        settled = true;
        (ok ? pass : fail)(msg);
        unsubscribe();
        resolve();
      };
      const unsubscribe = client.subscribe(
        UnseenOpenDialogsCountChangedDocument,
        { botID },
        {
          next: (data) =>
            done(true, `WS via relay: event unseenOpenDialogsCount=${String(data.unseenOpenDialogsCountChanged)}`),
          error: (err) => done(false, `WS via relay: ${err instanceof Error ? err.message : String(err)}`),
        },
      );
      setTimeout(() => done(true, 'WS via relay: subscription established (no error within 5s)'), 5000);
    });

    if (hasFlag('send')) {
      const contactID = arg('contact');
      if (!contactID) {
        fail('--send requires --contact <id>');
        return;
      }
      const conv = await client.mutate(CreateConversationDocument, { contactID });
      const conversationID = conv.conversationCreate.id;
      pass(`CreateConversation via proxy: id=${conversationID}`);

      const clientId = newClientId();
      const echoed = new Promise<string>((resolve, reject) => {
        const unsubscribe = client.subscribe(
          MessageAddedDocument,
          { botID, conversationID },
          {
            next: (data) => {
              if (data.messageAdded?.clientId === clientId) {
                unsubscribe();
                resolve(data.messageAdded.__typename);
              }
            },
            error: (err) => {
              unsubscribe();
              reject(err instanceof Error ? err : new Error(String(err)));
            },
          },
        );
      });
      await client.mutate(SendWidgetTextDocument, {
        botID,
        conversationID,
        message: { text: `live-check via relay ${new Date().toISOString()}`, clientId },
      });
      const typename = await withTimeout(echoed, 10_000, 'messageAdded echo through the relay');
      pass(`Send + subscription echo through the relay: ${typename}`);
    }
  } finally {
    await client.dispose();
    await vite.close();
  }
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
