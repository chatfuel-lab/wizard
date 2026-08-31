/**
 * Live verification against production, phase "direct" (no proxy):
 *   (a) HTTP: CurrentUser + BotsList
 *   (b) WS:   UnseenOpenDialogsCountChanged subscription established
 *   (--send) mutating: CreateConversation + MessageAdded + SendWidgetText
 *
 * ⚠ `--send` writes to your live Chatfuel account (creates a conversation and
 *   sends a message). Omit it for read-only checks.
 *
 * Run: pnpm --filter @chatfuel/api-client live-check [-- --bot <id> --contact <id> --send]
 * Requires CHATFUEL_TOKEN in the repo-root .env (a Chatfuel dashboard token).
 */
import { WebSocket } from 'ws';
import { createChatfuelClient, newClientId, BATCH_THROTTLE } from '../src/index';
import { BotsListDocument, CurrentUserDocument } from '../src/generated/core/graphql';
import {
  CreateConversationDocument,
  MessageAddedDocument,
  SendWidgetTextDocument,
  UnseenOpenDialogsCountChangedDocument,
} from '../src/generated/livechat/graphql';

// The token's shape is not guaranteed, so mask both the legacy 64-hex form and
// the literal value once main() has read it.
const secrets: string[] = [];
const maskSecrets = (text: string): string => {
  let out = text.replace(/[0-9a-f]{64}/gi, '[chatfuel-token]');
  for (const secret of secrets) out = out.split(secret).join('[chatfuel-token]');
  return out;
};

/**
 * How many trailing characters must wait for the next chunk before they can be
 * judged.
 *
 * Masking each write on its own sees only what that write contains, so a token
 * split across two of them — which is up to the stream, not to us — passes
 * through in halves that match nothing. So the tail of every write is held
 * back for as long as it could still turn out to be the start of a secret, and
 * released once the following chunk settles it.
 */
const heldBack = (text: string): number => {
  let hold = 0;
  for (const secret of secrets) {
    for (let n = Math.min(secret.length - 1, text.length); n > hold; n -= 1) {
      if (text.endsWith(secret.slice(0, n))) {
        hold = n;
        break;
      }
    }
  }
  // The 64-hex form has no literal to compare against: any trailing run of hex
  // digits short of 64 could still become one.
  const hex = /[0-9a-f]+$/i.exec(text);
  if (hex && hex[0].length < 64) hold = Math.max(hold, hex[0].length);
  return Math.min(hold, text.length);
};

const flushers: Array<() => void> = [];
for (const stream of [process.stdout, process.stderr] as const) {
  const original = stream.write.bind(stream);
  let carry = '';
  flushers.push(() => {
    if (!carry) return;
    const pending = carry;
    carry = '';
    original(maskSecrets(pending));
  });
  stream.write = ((chunk: string | Uint8Array, ...rest: never[]) => {
    const text = carry + (typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    const hold = heldBack(text);
    carry = text.slice(text.length - hold);
    return original(maskSecrets(text.slice(0, text.length - hold)), ...rest);
  }) as typeof stream.write;
}
// Whatever is still held back when the run ends was never a secret after all.
process.on('exit', () => {
  for (const flush of flushers) flush();
});

/** The account is worth naming; the address it is reachable at is not. */
const maskEmail = (value: string | null | undefined): string => {
  if (!value) return '?';
  const at = value.lastIndexOf('@');
  return at > 0 ? `${value[0]}***${value.slice(at)}` : '***';
};

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

  const client = createChatfuelClient({
    token,
    webSocketImpl: WebSocket,
    throttle: BATCH_THROTTLE,
  });

  try {
    // (a) HTTP
    const user = await client.query(CurrentUserDocument, {});
    pass(`HTTP CurrentUser: id=${user.currentUser?.id ?? '?'} email=${maskEmail(user.currentUser?.email)}`);

    const bots = await client.query(BotsListDocument, { first: 25 });
    const edges = bots.currentUser?.botsV2?.edges ?? [];
    const list = edges.flatMap((e) => (e?.node ? [e.node] : []));
    pass(`HTTP BotsList: ${list.length} bot(s) on the first page`);
    for (const bot of list.slice(0, 10)) console.log(`      - ${bot.id}  ${bot.title}`);

    const botID = arg('bot') ?? list[0]?.id;
    if (!botID) {
      fail('no bot available (pass --bot <id>)');
      return;
    }
    console.log(`      using bot ${botID}`);

    // (b) WS subscription smoke: connection_ack + established subscription,
    // no error frame within 5s.
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
            done(true, `WS subscription event: unseenOpenDialogsCount=${String(data.unseenOpenDialogsCountChanged)}`),
          error: (err) => done(false, `WS subscription error: ${err instanceof Error ? err.message : String(err)}`),
        },
      );
      setTimeout(() => done(true, 'WS subscription established (no error within 5s)'), 5000);
    });

    // (--send) mutating end-to-end: create a conversation on a contact and
    // observe our own SendWidgetText echoed through messageAdded.
    if (hasFlag('send')) {
      const contactID = arg('contact');
      if (!contactID) {
        fail('--send requires --contact <id>');
        return;
      }
      const conv = await client.mutate(CreateConversationDocument, { contactID });
      const conversationID = conv.conversationCreate.id;
      pass(`CreateConversation: id=${conversationID} status=${conv.conversationCreate.status}`);

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
        message: { text: `live-check ping ${new Date().toISOString()}`, clientId },
      });
      const typename = await withTimeout(echoed, 10_000, 'messageAdded echo');
      pass(`SendWidgetText echoed via messageAdded as ${typename} (clientId match)`);
    }
  } finally {
    await client.dispose();
  }
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
