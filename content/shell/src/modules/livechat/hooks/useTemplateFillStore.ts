import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AttachmentKind } from '~ui';
import {
  InboxFilledTemplateCreateDocument,
  InboxFilledTemplateSetBodyTextDocument,
  InboxFilledTemplateSetCopyCodeDocument,
  InboxFilledTemplateSetFooterTextDocument,
  InboxFilledTemplateSetHeaderDocumentDocument,
  InboxFilledTemplateSetHeaderImageDocument,
  InboxFilledTemplateSetHeaderTextDocument,
  InboxFilledTemplateSetHeaderVideoDocument,
  InboxFilledTemplateSetUrlButtonDocument,
  type InboxFilledTemplateFragment,
  type InboxWhatsAppTemplateFragment,
} from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { attachmentKindOf, uploadTypeForMime } from '../lib/attachments';
import { messageOf } from '../lib/errors';
import {
  EMPTY_TEMPLATE_FILL,
  selectCanSend,
  setterProblemText,
  templateFillReducer,
  type TemplateFillState,
} from '../lib/templateFillStore';
import {
  attachErrors,
  templateFields,
  templatePreview,
  type AttachedErrors,
  type TemplateField,
  type TemplatePreview,
} from '../lib/templatePreview';

/** The header file as the operator picked it — what the tile shows while it uploads and after. */
export interface PickedHeaderFile {
  name: string;
  size: number;
  kind: AttachmentKind;
  previewUrl: string | null;
}

export interface TemplateFillApi {
  state: TemplateFillState;
  /** The catalog row being filled, or null while the picker shows. */
  template: InboxWhatsAppTemplateFragment | null;
  /** The blanks, from the server's latest copy. Empty until it exists. */
  fields: TemplateField[];
  /** The server's verdict, beside each field. */
  errors: AttachedErrors;
  /** The message as it will land, from the server's copy. Null until it exists. */
  preview: TemplatePreview | null;
  canSend: boolean;
  headerFile: PickedHeaderFile | null;
  /** The header file could be uploaded at all — the host wired an upload path. */
  canUpload: boolean;
  pick: (template: InboxWhatsAppTemplateFragment | null) => void;
  /** Rejects with a sentence when the server refuses the value. */
  setText: (field: TemplateField, value: string) => Promise<void>;
  setHeaderFile: (field: TemplateField, file: File) => void;
}

const NO_FIELDS: TemplateField[] = [];
const NO_ERRORS: AttachedErrors = { byKey: {}, unattached: [] };

/**
 * The template form's wire half, over `lib/templateFillStore`.
 *
 * Every write goes: `setStarted` → mutation → `setAnswered` with the whole
 * copy the server sent back, or `setFailed` with what it threw. The form
 * re-renders from the copy and nothing else — the fields, the preview and the
 * send gate are all read off it — which is what makes "the server decides" a
 * property of the code rather than an intention.
 *
 * The header file is two steps, like an attachment: the REST upload for a
 * `FileID`, then the setter for the header's kind. The bytes never enter the
 * reducer; the picked file's name and thumbnail live here, beside it, for the
 * tile — and the thumbnail is the local object URL rather than the server's,
 * because the server's is a CDN address that has not always finished
 * processing by the time the tile is drawn.
 */
export function useTemplateFillStore(): TemplateFillApi {
  const { client, botId } = useLivechat();
  const [state, dispatch] = useReducer(templateFillReducer, EMPTY_TEMPLATE_FILL);
  const [template, setTemplate] = useState<InboxWhatsAppTemplateFragment | null>(null);
  const [headerFile, setHeaderFileState] = useState<PickedHeaderFile | null>(null);
  const upload = client.uploadFile;

  /* The reducer's epoch, readable from inside a promise chain that was
     started under an earlier one. */
  const epochRef = useRef(state.epoch);
  epochRef.current = state.epoch;

  const revokePreview = useCallback(() => {
    setHeaderFileState((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }, []);

  const pick = useCallback(
    (next: InboxWhatsAppTemplateFragment | null) => {
      setTemplate(next);
      revokePreview();
      dispatch({ type: 'picked', templateId: next?.id ?? null });
    },
    [revokePreview],
  );

  /* The create, keyed on the epoch the pick bumped: one temporary copy per
     pick, and a copy that answers after the next pick is inert. */
  const { epoch, templateId, creating } = state;
  useEffect(() => {
    if (!creating || !templateId) return;
    let cancelled = false;
    client
      .mutate(InboxFilledTemplateCreateDocument, { botID: botId, templateID: templateId })
      .then((data) => {
        if (cancelled) return;
        const filled = data.filledWhatsAppTemplateCreateTemporary;
        if (filled) dispatch({ type: 'created', epoch, filled });
        else dispatch({ type: 'createFailed', epoch, message: 'The server answered with no template.' });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({
            type: 'createFailed',
            epoch,
            message: messageOf(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, creating, templateId, epoch]);

  /**
   * One write, whatever the field: start, run the mutation the field's kind
   * needs, land the answer or the refusal. The promise the caller gets
   * rejects with the SENTENCE, so a `Field` can print it inline.
   */
  const write = useCallback(async (key: string, run: () => Promise<InboxFilledTemplateFragment | null | undefined>) => {
    const issued = epochRef.current;
    dispatch({ type: 'setStarted', epoch: issued, key });
    try {
      const filled = await run();
      if (!filled) throw new Error('The server answered with no template.');
      dispatch({ type: 'setAnswered', epoch: issued, key, filled });
    } catch (err) {
      const message = setterProblemText(err);
      dispatch({ type: 'setFailed', epoch: issued, key, message });
      throw new Error(message, { cause: err });
    }
  }, []);

  const setText = useCallback(
    async (field: TemplateField, value: string) => {
      const filled = state.filled;
      if (!filled) return;
      const templateID = filled.id;
      switch (field.kind) {
        case 'text': {
          const vars = { templateID, name: field.name, value };
          /* Three documents, three result field names; the branch is on the
             component so the answer is read off the right one. */
          return write(field.key, async () => {
            if (field.component === 'Header') {
              return (await client.mutate(InboxFilledTemplateSetHeaderTextDocument, vars))
                .filledWhatsAppTemplateSetHeaderTextParamValue;
            }
            if (field.component === 'Body') {
              return (await client.mutate(InboxFilledTemplateSetBodyTextDocument, vars))
                .filledWhatsAppTemplateSetBodyTextParamValue;
            }
            return (await client.mutate(InboxFilledTemplateSetFooterTextDocument, vars))
              .filledWhatsAppTemplateSetFooterTextParamValue;
          });
        }
        case 'urlParam':
          return write(
            field.key,
            async () =>
              (
                await client.mutate(InboxFilledTemplateSetUrlButtonDocument, {
                  templateID,
                  buttonID: field.buttonId,
                  name: field.name,
                  value,
                })
              ).filledWhatsAppTemplateSetURLButtonParamValue,
          );
        case 'copyCode':
          return write(
            field.key,
            async () =>
              (
                await client.mutate(InboxFilledTemplateSetCopyCodeDocument, {
                  templateID,
                  buttonID: field.buttonId,
                  codeValue: value,
                })
              ).filledWhatsAppTemplateSetCopyCodeButtonCodeValue,
          );
        case 'file':
          return;
      }
    },
    [client, state.filled, write],
  );

  const setHeaderFile = useCallback(
    (field: TemplateField, file: File) => {
      const filled = state.filled;
      if (!filled || field.kind !== 'file' || !upload) return;
      const type = uploadTypeForMime(file.type);
      const kind = attachmentKindOf(type);
      revokePreview();
      const previewUrl = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : null;
      setHeaderFileState({ name: file.name, size: file.size, kind, previewUrl });

      /* Answered before a byte is uploaded, in the tile rather than by the
         server: a PDF picked for an image header would upload fine and then
         be refused by the setter with a sentence about content types. */
      const wanted = field.fileKind === 'image' ? 'Image' : field.fileKind === 'video' ? 'Video' : 'Document';
      if (field.fileKind !== 'document' && type !== wanted) {
        dispatch({
          type: 'setFailed',
          epoch: epochRef.current,
          key: field.key,
          message: `This header takes ${field.fileKind === 'image' ? 'an image' : 'a video'}, not ${kind === 'document' ? 'a document' : `${kind === 'audio' ? 'an' : 'a'} ${kind}`}.`,
        });
        return;
      }

      const templateID = filled.id;
      void write(field.key, async () => {
        const uploaded = await upload(botId, file, wanted);
        if (field.fileKind === 'image') {
          return (
            await client.mutate(InboxFilledTemplateSetHeaderImageDocument, {
              templateID,
              fileID: uploaded.id,
            })
          ).filledWhatsAppTemplateSetHeaderImageFile;
        }
        if (field.fileKind === 'video') {
          return (
            await client.mutate(InboxFilledTemplateSetHeaderVideoDocument, {
              templateID,
              fileID: uploaded.id,
            })
          ).filledWhatsAppTemplateSetHeaderVideoFile;
        }
        return (
          await client.mutate(InboxFilledTemplateSetHeaderDocumentDocument, {
            templateID,
            fileID: uploaded.id,
            fileName: file.name,
          })
        ).filledWhatsAppTemplateSetHeaderDocumentFile;
      }).catch(() => {
        /* Landed in `problems` by `write`; the tile shows it. */
      });
    },
    [client, botId, upload, state.filled, write, revokePreview],
  );

  useEffect(() => () => revokePreview(), [revokePreview]);

  const fields = useMemo(() => (state.filled ? templateFields(state.filled) : NO_FIELDS), [state.filled]);
  const errors = useMemo(
    () => (state.filled ? attachErrors(fields, state.filled.errors) : NO_ERRORS),
    [fields, state.filled],
  );
  const preview = useMemo(() => (state.filled ? templatePreview(state.filled) : null), [state.filled]);

  return {
    state,
    template,
    fields,
    errors,
    preview,
    canSend: selectCanSend(state),
    headerFile,
    canUpload: upload !== undefined,
    pick,
    setText,
    setHeaderFile,
  };
}
