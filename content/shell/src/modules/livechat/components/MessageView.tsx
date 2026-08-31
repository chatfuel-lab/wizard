import type { ReactNode } from 'react';
import {
  Alert,
  AttachmentTile,
  Markdown,
  MessageActions,
  MessageBubble,
  SystemLine,
  shortTime,
  type MessageAction,
} from '~ui';
import { messageDirection, senderLabel } from '../lib/direction';
import { deliveryError, deliveryStatus, readPayload, type MessagePayload } from '../lib/messagePayload';
import type { MessageEntry } from '../lib/threadStore';
import { AudioBubble } from './bubbles/AudioBubble';
import { ButtonsBubble } from './bubbles/ButtonsBubble';
import { CommentBubble } from './bubbles/CommentBubble';
import { DescribedBubble } from './bubbles/DescribedBubble';
import { DocumentBubble } from './bubbles/DocumentBubble';
import { ImageBubble } from './bubbles/ImageBubble';
import { ListBubble } from './bubbles/ListBubble';
import { TapBubble } from './bubbles/TapBubble';
import { TemplateBubble } from './bubbles/TemplateBubble';
import { TextBubble } from './bubbles/TextBubble';
import { VideoBubble } from './bubbles/VideoBubble';

/**
 * One row of the thread.
 *
 * Every decision this used to make has moved to `lib/messagePayload.ts`, where
 * a node-only vitest can reach it: which field carries the text on this
 * platform, which enum value means read, whether an error outranks a status.
 * What is left is the mapping from an already-decided payload to JSX, which is
 * the part a test could not check anyway.
 */
function payloadContent(payload: MessagePayload): ReactNode {
  switch (payload.kind) {
    case 'text':
      return <TextBubble text={payload.text} />;
    case 'image':
      return <ImageBubble url={payload.url} caption={payload.caption} label={payload.label} />;
    case 'video':
      return <VideoBubble url={payload.url} caption={payload.caption} label={payload.label} />;
    case 'audio':
      return <AudioBubble url={payload.url} transcript={payload.transcript} label={payload.label} />;
    case 'document':
      return (
        <DocumentBubble
          url={payload.url}
          name={payload.name}
          size={payload.size}
          caption={payload.caption}
          label={payload.label}
        />
      );
    case 'buttons':
      return <ButtonsBubble header={payload.header} body={payload.body} footer={payload.footer} />;
    case 'list':
      return <ListBubble body={payload.body} buttonTitle={payload.buttonTitle} />;
    case 'template':
      return <TemplateBubble header={payload.header} body={payload.body} footer={payload.footer} />;
    case 'comment':
      return <CommentBubble text={payload.text} source={payload.source} label={payload.label} />;
    case 'tap':
      return <TapBubble title={payload.title} description={payload.description} />;
    case 'described':
      return <DescribedBubble shape={payload.shape} label={payload.label} />;
    /* 'skip' and 'system' never reach a bubble — MessageView answers both
       before it gets here. Listed so the switch stays exhaustive. */
    case 'skip':
    case 'system':
      return null;
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }
}

/**
 * The buttons UNDER the bubble, for the three payloads that carry any.
 *
 * Under, not inside: WhatsApp draws reply buttons, list options and template
 * buttons as their own rows below the text, and a button inside the bubble box
 * reads as part of the text. `MessageBubble.actions` is the slot for exactly
 * this; it keeps the column, the width cap and the alignment the bubble's.
 */
function payloadActions(payload: MessagePayload): readonly MessageAction[] | null {
  switch (payload.kind) {
    case 'buttons':
    case 'list':
    case 'template':
      return payload.actions.length > 0 ? payload.actions : null;
    default:
      return null;
  }
}

const actionsSlot = (actions: readonly MessageAction[] | null): ReactNode =>
  actions && actions.length > 0 ? <MessageActions actions={actions} /> : undefined;

/**
 * The line under an optimistic row whose mutation was refused. The reducer
 * carries the mutation's own verdict when there is one (`sendFailureText`);
 * this is the fallback for a rejection that arrived without a sentence.
 */
const GENERIC_SEND_FAILURE = 'Not sent. Check your connection, and that you still have the Inbox: Edit permission.';

export function MessageView({ entry }: { entry: MessageEntry }) {
  const { node } = entry;

  /* A null node is an optimistic send: the server holds no record of it yet, so
   * every typename rule below is inapplicable rather than merely unknown. An
   * earlier version handed those rules an INVENTED typename, which began with
   * `System` and was therefore dropped by the System* branch — so a message the
   * operator had just sent showed nothing at all until the echo came back. */
  if (!node) {
    return (
      <MessageBubble
        direction="out"
        time={shortTime(entry.sentTime)}
        status={entry.failed ? 'failed' : 'sending'}
        error={entry.failed ? (entry.failure ?? GENERIC_SEND_FAILURE) : undefined}
        actions={entry.template ? actionsSlot(entry.template.content.actions) : undefined}
      >
        {/* A file and its caption are two messages on every one of these
            platforms — each attachment mutation carries exactly one file and no
            text — so an optimistic row is one or the other, never both. The
            tile is the same one the composer's tray shows, in its resting
            state: the upload finished before the send was even attempted.

            A template row is drawn the way its echo will be — the same
            `TemplateBubble`, from the same `TemplateContent` the thread reads
            off a `WhatsAppOutTemplateMessage` — so the row does not change
            shape when the server confirms it. No name in either state: there
            is no template name on the wire. */}
        {entry.attachment ? (
          <AttachmentTile
            kind={entry.attachment.kind}
            name={entry.attachment.name}
            previewUrl={entry.attachment.previewUrl}
          />
        ) : entry.template ? (
          <TemplateBubble
            header={entry.template.content.header}
            body={entry.template.content.body}
            footer={entry.template.content.footer}
          />
        ) : (
          <TextBubble text={entry.localText ?? ''} />
        )}
      </MessageBubble>
    );
  }

  const payload = readPayload(node);

  /* A typing hint is transient state carrying an `until`, not a row.
   * `threadStore` already keeps it out of the message map; this is the second
   * lock, and it is the one that holds if a node ever reaches a view by another
   * route. */
  if (payload.kind === 'skip') return null;

  if (payload.kind === 'system') {
    /* The AI's handover summary is Markdown — the field is documented as such
       and the model writes it as such, with a bold lead line and bullets — and
       it is the one system row an operator is meant to READ rather than glance
       at. So it gets a block that renders the markup, not a centred pill sized
       for "opened by an operator" and not the raw asterisks. Everything else
       genuinely is a one-line marker.

       `compact` because this is a boxed note between bubbles: tighter block
       spacing and the smaller heading scale. */
    if (node.__typename === 'SystemConversationSummaryMessage') {
      return (
        <Alert tone="info" title="Conversation summary" className="my-2">
          <Markdown text={payload.text} compact />
        </Alert>
      );
    }
    return <SystemLine>{payload.text}</SystemLine>;
  }

  const direction = messageDirection(node);
  return (
    <MessageBubble
      direction={direction}
      time={shortTime(node.sentTime)}
      /* Only an operator's name is printed, and only above an operator's
         bubble — `sender.name` on the contact and on the automation is a
         server placeholder, not a name. See `senderLabel`. */
      senderName={senderLabel(node)}
      /* Ticks are an outgoing message's story. An inbound one still shows its
         error line, because a comment the platform refused to publish is a
         failure the operator has to know about. */
      status={direction === 'out' ? deliveryStatus(node) : undefined}
      error={deliveryError(node)}
      actions={actionsSlot(payloadActions(payload))}
    >
      {payloadContent(payload)}
    </MessageBubble>
  );
}
