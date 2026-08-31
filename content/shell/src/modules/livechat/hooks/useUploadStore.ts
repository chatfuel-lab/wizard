import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Platform } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { attachmentKindOf, uploadTypeForMime } from '../lib/attachments';
import {
  classifyUploadFailure,
  EMPTY_UPLOAD_STATE,
  selectSendable,
  selectUploading,
  uploadReducer,
  type PickedFile,
  type StagedAttachment,
} from '../lib/uploadStore';

export interface AttachmentsState {
  /** Everything in the tray, in the order it was picked. */
  staged: StagedAttachment[];
  /** The ones that would go out — also the composer's `attachmentCount`. */
  sendable: StagedAttachment[];
  /** An upload is running: the composer's `sending`, not its `disabled`. */
  uploading: boolean;
  /**
   * The host wired no upload path. `ThreadComposer` passes no `onAttach` at
   * all in that case, so the paperclip never renders — a channel that cannot
   * take attachments does not get a disabled button nobody can use.
   */
  supported: boolean;
  attach: (files: File[]) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  /** Hand the ready files to the caller and empty their slots in one step. */
  take: () => StagedAttachment[];
}

const NONE: StagedAttachment[] = [];

/**
 * The composer's tray, wired to the REST upload.
 *
 * The upload starts the moment a file is picked, not when send is pressed —
 * which is the whole reason the tray exists as its own state rather than as a
 * field on the message being composed. By the time the operator finishes
 * typing, the `FileID` is usually already in hand and the send is one mutation.
 *
 * Every decision is in `lib/uploadStore.ts` and `lib/attachments.ts`, where a
 * node-only vitest can reach it. What is left here is the parts that are not
 * decisions: the bytes, which never enter the reducer, and the object URLs,
 * which have to be revoked by whoever made them.
 *
 * Uploads are started by an effect reading the tray rather than by the handler
 * that filled it. The reducer is what decides whether a file is uploading at
 * all — it refuses the ones this channel cannot carry and caps how many can
 * wait at once — and a handler firing its own uploads would have to make both
 * of those decisions a second time, from a `state` one render out of date.
 */
export function useUploadStore(conversationId: string | null, platform: Platform | null): AttachmentsState {
  const { client, botId } = useLivechat();
  const [state, dispatch] = useReducer(uploadReducer, EMPTY_UPLOAD_STATE);
  const upload = client.uploadFile;

  /* The `File` objects, beside the reducer rather than in it. A retry needs the
     original bytes, and a reducer holding a File is a reducer no node test can
     build a case for. */
  const filesRef = useRef(new Map<string, File>());
  const seqRef = useRef(0);
  /* Which ids already have an upload in flight. Without it the effect below
     re-fires every one of them on any unrelated change to the tray. */
  const startedRef = useRef(new Set<string>());
  /* Every object URL this hook has created, so the revoke on unmount does not
     depend on what the reducer still happens to be holding. */
  const urlsRef = useRef(new Set<string>());

  const attach = useCallback(
    (files: File[]) => {
      if (!platform || files.length === 0) return;
      const picked: PickedFile[] = files.map((file) => {
        seqRef.current += 1;
        const id = `staged-${seqRef.current}`;
        filesRef.current.set(id, file);
        const kind = attachmentKindOf(uploadTypeForMime(file.type));
        /* Only where there is something to look at. An object URL for a PDF is
           a live blob the browser holds until it is revoked, in exchange for a
           thumbnail nothing renders. */
        const previewUrl = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : null;
        if (previewUrl) urlsRef.current.add(previewUrl);
        return { id, name: file.name, size: file.size, mimeType: file.type, previewUrl };
      });
      dispatch({ type: 'staged', platform, files: picked });
    },
    [platform],
  );

  useEffect(() => {
    if (!upload) return;
    for (const attachment of state.staged) {
      if (attachment.status !== 'uploading') continue;
      if (startedRef.current.has(attachment.id)) continue;
      const file = filesRef.current.get(attachment.id);
      if (!file) continue;
      const { id } = attachment;
      startedRef.current.add(id);
      upload(botId, file, attachment.type)
        .then((uploaded) => dispatch({ type: 'uploaded', id, fileId: uploaded.id }))
        .catch((err: unknown) => dispatch({ type: 'uploadFailed', id, failure: classifyUploadFailure(err) }));
    }
  }, [state.staged, upload, botId]);

  const forget = useCallback((ids: readonly string[]) => {
    for (const id of ids) {
      filesRef.current.delete(id);
      startedRef.current.delete(id);
    }
  }, []);

  const retry = useCallback((id: string) => {
    /* Clearing the started mark is what makes the effect pick this one up
       again; the dispatch alone would put the tile back into 'uploading' and
       leave it there forever. */
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

  const sendable = useMemo(() => selectSendable(state), [state]);

  /* The tray is emptied of exactly what was taken, not of everything: an upload
     that finished while the send was being assembled is still staged
     afterwards, and the operator has not been told otherwise. */
  const take = useCallback(() => {
    if (sendable.length === 0) return NONE;
    const ids = sendable.map((attachment) => attachment.id);
    dispatch({ type: 'sent', ids });
    forget(ids);
    return sendable;
  }, [sendable, forget]);

  /* A tray belongs to one conversation. Carrying it across a switch would put
     the operator's holiday photo into a stranger's thread on the next send —
     and keyed on the id rather than on the platform, because two WhatsApp
     conversations are two trays and share a platform. */
  useEffect(() => {
    dispatch({ type: 'cleared' });
    filesRef.current.clear();
    startedRef.current.clear();
    /* Safe here and nowhere earlier: a sent attachment's object URL is still
       on screen in its optimistic bubble until the server echoes the message
       back, and opening another conversation is the moment those bubbles stop
       existing. Revoking at `take()` time would blank the picture the operator
       just sent. */
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
    staged: state.staged,
    sendable,
    uploading: selectUploading(state),
    supported: upload !== undefined,
    attach,
    retry,
    remove,
    take,
  };
}
