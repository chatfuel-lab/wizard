import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { newClientId } from '~api';
import { CoworkerSendAudioDocument, CoworkerSendWithAttachmentsDocument } from '~api/generated/coworker/graphql';
import { useCoworker } from '../CoworkerContext';
import { classifyUploadFailure } from '../lib/attachments';
import {
  EMPTY_TRAY,
  selectSendable,
  selectUploading,
  sendPlan,
  trayReducer,
  type PickedFile,
  type StagedAttachment,
} from '../lib/trayStore';

export interface ComposerAttachments {
  /** Everything in the tray, in the order it was picked. */
  staged: StagedAttachment[];
  /** The ones that would go out — also the composer's `attachmentCount`. */
  sendable: StagedAttachment[];
  /** An upload is running: the composer's `sending`, not its `disabled`. */
  uploading: boolean;
  /**
   * The host wired no upload path. The composer then offers no attach control
   * at all rather than a disabled one nobody can use — an embed with no REST
   * proxy is a place where attachments do not exist, not one where they are
   * temporarily unavailable.
   */
  supported: boolean;
  /** One line about the pick itself — see `TrayState.notice`. */
  notice: string | null;
  /** A send that failed. Cleared by the next attach or send. */
  error: string | null;
  attach: (files: File[]) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  /**
   * Send what is staged. Returns true when the typed text went out WITH the
   * attachments as their caption, so the caller knows not to send it again.
   *
   * Synchronous in its answer and asynchronous in its work: on an empty screen
   * there is no conversation yet, and the id is resolved — created, if need be —
   * after the caller has already been told what to do with the text.
   */
  send: (text: string) => boolean;
}

const NONE: StagedAttachment[] = [];

/**
 * The composer's tray, wired to the REST upload and to the two send mutations
 * that are not the thread's.
 *
 * The upload starts the moment a file is picked, not when send is pressed —
 * which is the whole reason the tray is its own state rather than a field on
 * the message being composed. By the time the operator has finished typing the
 * `FileID` is usually already in hand and the send is one mutation.
 *
 * The sends live here rather than in `useCoworkerThread` because they are not
 * the same send: `sendMessageWithAttachments` and `sendAudioMessage` are
 * separate mutations with separate rules, and the composer is the only thing
 * that knows what is in the tray. The frozen props say as much — the thread
 * hands down `onSendText` and nothing else.
 *
 * What that costs, honestly: the thread's optimistic entry is built inside
 * `useCoworkerThread` and only text goes through it, so an attachment message
 * appears when the server echoes it back rather than the instant it is sent.
 * Closing that would mean a prop the frozen contract does not have.
 *
 * Every decision is in `lib/attachments.ts` and `lib/trayStore.ts`, where a
 * node-only vitest can reach it. What is left here is the parts that are not
 * decisions: the bytes, which never enter the reducer, and the object URLs,
 * which have to be revoked by whoever made them.
 */
export function useAttachments(
  conversationId: string | null,
  ensureConversation: () => Promise<string | null>,
): ComposerAttachments {
  const { client, botId } = useCoworker();
  const [tray, dispatch] = useReducer(trayReducer, EMPTY_TRAY);
  const [error, setError] = useState<string | null>(null);
  const upload = client.uploadFile;

  /* The `File` objects, beside the reducer rather than in it. A retry needs the
     original bytes, and a reducer holding a File is a reducer no node test can
     build a case for. */
  const filesRef = useRef(new Map<string, File>());
  const seqRef = useRef(0);
  /* Which ids already have an upload in flight. Without it the effect below
     re-fires every one of them on any unrelated change to the tray. */
  const startedRef = useRef(new Set<string>());
  /* Every object URL this hook has made, so the revoke on unmount does not
     depend on what the reducer still happens to be holding. */
  const urlsRef = useRef(new Set<string>());

  const attach = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const picked: PickedFile[] = files.map((file) => {
      seqRef.current += 1;
      const id = `staged-${seqRef.current}`;
      filesRef.current.set(id, file);
      /* Only where there is something to look at. An object URL for a PDF is a
         live blob the browser holds until it is revoked, in exchange for a
         thumbnail nothing renders. */
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      if (previewUrl) urlsRef.current.add(previewUrl);
      return { id, name: file.name, size: file.size, mimeType: file.type, previewUrl };
    });
    dispatch({ type: 'staged', files: picked });
  }, []);

  /* Uploads are started by an effect reading the tray, not by the handler that
     filled it. The reducer is what decides whether a file is uploaded at all —
     it refuses what the API will not take and caps how many can wait — and a
     handler firing its own uploads would have to make both of those decisions a
     second time, from a `tray` one render out of date. */
  useEffect(() => {
    if (!upload) return;
    for (const attachment of tray.staged) {
      if (attachment.status !== 'uploading') continue;
      if (startedRef.current.has(attachment.id)) continue;
      const file = filesRef.current.get(attachment.id);
      if (!file) continue;
      const { id } = attachment;
      startedRef.current.add(id);
      upload(botId, file, attachment.uploadType)
        .then((uploaded) => dispatch({ type: 'uploaded', id, fileId: uploaded.id }))
        .catch((err: unknown) => dispatch({ type: 'uploadFailed', id, failure: classifyUploadFailure(err) }));
    }
  }, [tray.staged, upload, botId]);

  const forget = useCallback((ids: readonly string[]) => {
    for (const id of ids) {
      filesRef.current.delete(id);
      startedRef.current.delete(id);
    }
  }, []);

  const retry = useCallback((id: string) => {
    /* Clearing the started mark is what makes the effect pick this one up
       again; the dispatch alone would put the tile back into 'uploading' and
       leave it there for ever. */
    startedRef.current.delete(id);
    dispatch({ type: 'retried', id });
  }, []);

  const remove = useCallback(
    (id: string) => {
      dispatch({ type: 'removed', id });
      forget([id]);
    },
    [forget],
  );

  const sendable = useMemo(() => selectSendable(tray), [tray]);

  const send = useCallback(
    (text: string) => {
      if (sendable.length === 0) return false;
      const plan = sendPlan(sendable, text.trim() !== '');
      const ids = [...plan.voice, ...plan.files].map((attachment) => attachment.id);
      setError(null);

      const fail = (err: unknown) => setError(err instanceof Error ? err.message : String(err));

      void (async () => {
        /* There may be no conversation at all: the operator dropped a file onto
           an empty screen. Creating it here rather than when the file was
           picked is what keeps a cancelled attachment from leaving a ghost row
           on the account — the same rule "New chat" follows. */
        let target = conversationId;
        if (target === null) target = await ensureConversation();
        if (target === null) {
          setError('Could not start a chat to send these to. Try again.');
          return;
        }

        /* Voice notes first, one mutation each — the audio route takes exactly
           one file and no text at all. Then everything else as ONE message with
           the typed line as its caption, which is the shape this API has and
           livechat's channels do not. */
        for (const note of plan.voice) {
          client
            .mutate(CoworkerSendAudioDocument, {
              conversationID: target,
              clientID: newClientId(),
              fileID: note.fileId!,
            })
            .catch(fail);
        }
        if (plan.files.length > 0) {
          client
            .mutate(CoworkerSendWithAttachmentsDocument, {
              conversationID: target,
              clientID: newClientId(),
              text: plan.textRidesAlong ? text : null,
              fileIDs: plan.files.map((attachment) => attachment.fileId!),
            })
            .catch(fail);
        }

        /* Emptied of exactly what went, and only once it has somewhere to go:
           an upload that finished while the send was being assembled is still
           staged afterwards, and a send that never found a conversation leaves
           the tray intact with the reason above it. */
        dispatch({ type: 'sent', ids });
        forget(ids);
      })();

      return plan.textRidesAlong;
    },
    [client, conversationId, ensureConversation, sendable, forget],
  );

  /* A tray belongs to one conversation. Carrying it across a switch would put
     a price list into a thread that never asked for one.
     
     Except for the one switch that is not a switch: an empty screen becoming a
     real conversation because the operator sent from it. The tray they staged
     there IS this conversation's, and clearing it would delete the files
     mid-flight. */
  const previousConversation = useRef<string | null>(conversationId);
  useEffect(() => {
    const cameFromNothing = previousConversation.current === null;
    previousConversation.current = conversationId;
    if (cameFromNothing) return;
    dispatch({ type: 'cleared' });
    setError(null);
    filesRef.current.clear();
    startedRef.current.clear();
    /* Safe here and nowhere earlier: an attachment's object URL is still on
       screen in the thread until the server echoes the message back, and
       opening another conversation is the moment those tiles stop existing.
       Revoking at send time would blank the picture just sent. */
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current.clear();
  }, [conversationId]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  return {
    staged: tray.staged,
    sendable: sendable.length === 0 ? NONE : sendable,
    uploading: selectUploading(tray),
    supported: upload !== undefined,
    notice: tray.notice,
    error,
    attach,
    retry,
    remove,
    send,
  };
}
