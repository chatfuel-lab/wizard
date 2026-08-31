import { useMemo, useState, type ReactNode } from 'react';
import { IconPlay } from '../icons';
import { Alert } from '../primitives/Alert';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';
import { Markdown } from '../primitives/Markdown';
import { Spinner } from '../primitives/Spinner';
import { safeHref } from '../lib/markdown';
import {
  isHandedOff,
  clockTime,
  type TestChatAction,
  type TestChatMedia,
  type TestChatRow,
  type TestChatStatus,
} from '../lib/chat/testChat';
import { AttachmentTile } from './AttachmentTile';
import { Composer } from './Composer';
import { MessageActions } from './MessageActions';
import { MessageBubble } from './MessageBubble';
import { MessageList } from './MessageList';
import { SystemLine } from './SystemLine';
import { TypingIndicator } from './TypingIndicator';

/** What `MessageList` needs from a row — its identity and its instant. */
interface ListItem {
  id: string;
  at: number;
  row: TestChatRow;
}

export interface TestChatProps {
  status: TestChatStatus;
  rows: readonly TestChatRow[];
  typing: boolean;
  /** A readback is deciding whether there is a session to adopt. */
  restoring?: boolean;
  /** Start failure — the empty state, never a toast. */
  error: string | null;
  threadError: string | null;
  threadLoading: boolean;
  /** Identity of the conversation; the list re-anchors to the newest message when it changes. */
  threadKey: string;
  /** The name above the bot's bubbles. */
  botName: string;
  canSend: boolean;
  onSend: (text: string) => void | Promise<void>;
  onStart: () => void;
  /** A button or list row was pressed. Absent = the messages are a transcript. */
  onAction?: (row: TestChatRow, action: TestChatAction) => void;
  /** Whether Start is possible at all (something is picked; the role allows it). */
  canStart: boolean;
  /** Before the first start: what will answer. */
  emptyTitle: string;
  /** Beside "Try again" when the start was refused — a way to fix the cause. */
  errorAction?: ReactNode;
  /** Alerts above the thread. */
  alerts?: ReactNode;
  /** Narrow host: fold the composer's slot behind "+". */
  compact?: boolean;
  /** Why the composer is closed when it is (a permission, a state). */
  disabledHint?: string;
  placeholder?: string;
}

/**
 * The test conversation: alerts, the scroller, the composer.

 * There is no explanatory line above it and no blurb under the empty state's
 * title. What a test does is not a thing to read about — the panel's own header
 * says what it is pinned to, and pressing Start says the rest in a second. The
 * caveats that used to live here (pinned means pinned; a disabled rule still
 * answers) are in the skill docs, where they are read by whoever is building on
 * the API, and on screen only as an `Alert` when they are actually true.
 *
 * In a test YOU are the contact, so a message you sent renders as an OUTGOING
 * bubble on the right and the bot's answer as an INCOMING bubble on the left
 * under its name; the hand-off trio and anything the host's fragment selects
 * nothing for are `SystemLine`s. Buttons and list rows sit UNDER their bubble
 * and, unlike an operator's inbox, they are pressable — that is the whole
 * difference between reading a transcript and testing a flow.
 *
 * This component holds no state beyond one broken-image flag; the session hook
 * holds the rest.
 */
export function TestChat({
  status,
  rows,
  typing,
  restoring = false,
  error,
  threadError,
  threadLoading,
  threadKey,
  botName,
  canSend,
  onSend,
  onStart,
  onAction,
  canStart,
  emptyTitle,
  errorAction,
  alerts,
  compact = false,
  disabledHint,
  placeholder = 'Write as the customer would…',
}: TestChatProps) {
  const items = useMemo<ListItem[]>(() => rows.map((row) => ({ id: row.key, at: row.at, row })), [rows]);
  const started = status !== 'idle' && status !== 'error';
  /* After the hand-off trio the bot is out of the conversation — an operator
     owns it now — so nothing would answer; the composer says so and Restart is
     the way on (a new session, the old rows behind the watermark). */
  const handedOff = isHandedOff(rows);

  let body: ReactNode;
  if (restoring && !started) {
    body = (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner size={16} />
      </div>
    );
  } else if (status === 'error' && error) {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EmptyState
          icon={<IconPlay />}
          title="Could not start the test"
          description={error}
          action={
            canStart ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={onStart}>
                  Try again
                </Button>
                {errorAction}
              </div>
            ) : (
              errorAction
            )
          }
        />
      </div>
    );
  } else if (!started) {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EmptyState
          icon={<IconPlay />}
          title={emptyTitle}
          action={
            <Button size="sm" onClick={onStart} disabled={!canStart}>
              <IconPlay size={14} />
              Start test
            </Button>
          }
        />
      </div>
    );
  } else {
    body = (
      <MessageList
        items={items}
        renderItem={(item) => (
          <TestChatRowView row={item.row} botName={botName} onAction={onAction} compact={compact} />
        )}
        threadKey={threadKey}
        aria-label="Test conversation"
        estimateItemHeight={56}
        footer={typing ? <TypingIndicator /> : null}
        empty={
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-text-muted">
            {status === 'starting' || threadLoading ? (
              <span className="flex items-center gap-2">
                <Spinner size={14} /> {status === 'starting' ? 'Starting the session…' : 'Loading…'}
              </span>
            ) : (
              <span>The session is ready — say something below.</span>
            )}
          </div>
        }
      />
    );
  }

  const hint =
    disabledHint ??
    (!started
      ? 'Start the test to write'
      : status === 'starting'
        ? 'Starting…'
        : handedOff
          ? 'The chat was handed to an operator — restart to test again.'
          : undefined);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {alerts ? <div className="flex shrink-0 flex-col gap-2 px-gutter pt-2">{alerts}</div> : null}
      {threadError ? (
        <div className="shrink-0 px-gutter pt-2">
          <Alert tone="warning">{threadError}</Alert>
        </div>
      ) : null}
      {body}
      <Composer
        onSend={onSend}
        disabled={!canSend || handedOff}
        disabledHint={hint}
        placeholder={placeholder}
        compact={compact}
      />
    </div>
  );
}

function TestChatRowView({
  row,
  botName,
  onAction,
  compact,
}: {
  row: TestChatRow;
  botName: string;
  onAction?: (row: TestChatRow, action: TestChatAction) => void;
  compact: boolean;
}) {
  const time = clockTime(row.sentTime);
  if (row.kind === 'system') {
    if (row.systemKind === 'other' || !row.text) return <SystemLine>Unsupported message</SystemLine>;
    /* The AI's handover summary is Markdown — the model writes a bold lead line
       and bullets — and it is several sentences an operator is meant to read.
       A centred one-line pill is the wrong container for it and printed the
       asterisks besides. Every other system row genuinely is a one-line marker. */
    if (row.systemKind === 'summary') {
      return (
        <Alert tone="info" title="Conversation summary" className="my-2">
          <Markdown text={row.text} compact={compact} />
        </Alert>
      );
    }
    return <SystemLine>{row.text}</SystemLine>;
  }
  if (row.kind === 'typing') return null;

  const mine = row.kind === 'in';
  const status = mine ? (row.failure ? 'failed' : row.pending ? 'sending' : 'sent') : undefined;
  const actions = row.actions ?? [];
  /* A click is addressed by the message's wire id plus the button's title, so a
     message that arrived without an id has nothing to press. Its buttons still
     render — they are what the flow offered — just not as controls. */
  const pressable = onAction && row.id !== null && actions.some((action) => action.click);

  return (
    <MessageBubble
      direction={mine ? 'out' : 'in'}
      time={time}
      senderName={mine ? undefined : botName || row.senderLabel}
      status={status}
      error={row.failure ?? undefined}
      actions={
        actions.length > 0 ? (
          <MessageActions
            actions={actions}
            onSelect={pressable ? (action) => onAction(row, action as TestChatAction) : undefined}
          />
        ) : null
      }
    >
      <TestChatPayload row={row} />
    </MessageBubble>
  );
}

/**
 * What is inside the bubble: a header line, the media, the body, a footer line.
 *
 * The four are the shape of every structured message these platforms send — a
 * WhatsApp buttons message, a list, a template — and a plain text is the same
 * shape with three of them empty. A typename the host's fragment selects
 * nothing for arrives with `supported: false` and says so rather than rendering
 * an empty bubble.
 */
function TestChatPayload({ row }: { row: TestChatRow }) {
  if (!row.supported) return <span className="text-sm italic opacity-70">Unsupported message</span>;
  return (
    <div className="flex flex-col gap-1">
      {row.header ? <span className="font-semibold break-words">{row.header}</span> : null}
      {row.media ? <TestChatMediaView media={row.media} /> : null}
      {row.text ? <span className="whitespace-pre-wrap">{row.text}</span> : null}
      {row.footer ? <span className="text-xs opacity-70">{row.footer}</span> : null}
    </div>
  );
}

/**
 * Chat media expires, and the storage hands back a well-formed URL for a file
 * that is already gone — so every branch here has a failure face rather than
 * the browser's broken-image glyph inside a bubble with no text in it.
 */
function TestChatMediaView({ media }: { media: TestChatMedia }) {
  const [broken, setBroken] = useState(false);
  const name = media.name ?? media.kind;

  /* The URL is wire data. A media element with a hostile one is a request the
     tag would have made anyway, but `window.open` NAVIGATES, and a scheme is
     the browser's to interpret once it does — so the document branch opens
     nothing it has not first recognised as http(s).

     Only the image carries `referrerPolicy`: HTML has no such attribute on
     `<video>` or `<audio>`, so those two leak the dashboard URL to whoever
     hosts the file unless the page sets a `Referrer-Policy` header. That is
     the host app's to set, not this component's. */
  const openable = safeHref(media.url);

  if (broken || !media.url) {
    return <AttachmentTile kind={media.kind} name={name} state="failed" error="This file did not load" />;
  }
  if (media.kind === 'image') {
    return (
      <img
        src={media.url}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="max-h-48 rounded-card object-contain"
      />
    );
  }
  if (media.kind === 'video') {
    return <video src={media.url} controls onError={() => setBroken(true)} className="max-h-48 rounded-card" />;
  }
  if (media.kind === 'audio') {
    return <audio src={media.url} controls onError={() => setBroken(true)} className="w-full" />;
  }
  return (
    <AttachmentTile
      kind="document"
      name={name}
      state={openable ? 'ready' : 'failed'}
      error={openable ? undefined : 'This file did not load'}
      onOpen={openable ? () => window.open(openable, '_blank', 'noopener,noreferrer') : undefined}
    />
  );
}
