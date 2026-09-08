import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AttachmentKind } from '~ui';
import {
  BroadcastSetBodyTextDocument,
  BroadcastSetCopyCodeDocument,
  BroadcastSetFooterTextDocument,
  BroadcastSetHeaderDocumentDocument,
  BroadcastSetHeaderImageDocument,
  BroadcastSetHeaderTextDocument,
  BroadcastSetHeaderVideoDocument,
  BroadcastSetTemplateDocument,
  BroadcastSetUrlButtonParamDocument,
} from '~api/generated/broadcasts/graphql';
import { useCampaigns } from '../BroadcastsCampaignsContext';
import { useBroadcasts } from '../BroadcastsContext';
import { findPayloadBlock, type CampaignRecord } from '../lib/campaign';
import {
  EMPTY_TEMPLATE_FILL,
  refusedByField,
  selectCanContinue,
  setterProblemText,
  templateFillReducer,
  type TemplateFillState,
} from '../lib/templateFillStore';
import {
  attachErrors,
  componentsOfConfig,
  templateFields,
  templatePreview,
  type AttachedErrors,
  type TemplateField,
  type TemplatePreview,
} from '../lib/templatePreview';
import { problemText } from '../lib/errors';
import type { CampaignBlock, CatalogTemplate, TemplateConfig, TemplateElement } from '../types';

/** The header file as the person picked it — what the tile shows while it uploads and after. */
export interface PickedHeaderFile {
  name: string;
  size: number;
  kind: AttachmentKind;
  previewUrl: string | null;
}

export interface TemplateFillApi {
  state: TemplateFillState;
  /** The template on the payload element, parameters and all. Null until one is picked. */
  template: TemplateConfig | null;
  /** The blanks, from the server's latest element. Empty until a template is on it. */
  fields: TemplateField[];
  /** The server's verdict, beside each field. */
  errors: AttachedErrors;
  /** Field key → attribute names the server refused inside its value. */
  refused: Record<string, string[]>;
  /** The message as it will land. Null until a template is on the element. */
  preview: TemplatePreview | null;
  canContinue: boolean;
  headerFile: PickedHeaderFile | null;
  /** The header file could be uploaded at all — the host wired an upload path. */
  canUpload: boolean;
  pick: (template: CatalogTemplate) => void;
  /** Rejects with a sentence when the server refuses the value. */
  setText: (field: TemplateField, value: string) => Promise<void>;
  setHeaderFile: (field: TemplateField, file: File) => void;
}

const NO_FIELDS: TemplateField[] = [];
const NO_ERRORS: AttachedErrors = { byKey: {}, unattached: [] };
const NO_REFUSED: Record<string, string[]> = {};

const templateElementOf = (block: CampaignBlock): TemplateElement | null => {
  const element = block.blockElements.find(
    (candidate): candidate is TemplateElement => candidate.__typename === 'WhatsAppTemplateBlockElement',
  );
  return element ?? null;
};

/**
 * The message form's wire half, over `lib/templateFillStore`.
 *
 * A copy of the livechat module's `hooks/useTemplateFillStore.ts` re-keyed
 * by the draft's payload element. Every write goes `setStarted` → the
 * setter, through the campaigns store's `writeBlock` so the list holds the
 * same block → `setAnswered` with the element the server sent back, or
 * `setFailed` with what it threw. The form re-renders from that element and
 * nothing else — the fields, the preview and the gate are all read off it.
 *
 * The header file is two steps: the REST upload for a `FileID`, then the
 * setter for the header's kind. The picked file's name and thumbnail live
 * here beside the reducer, for the tile — the thumbnail is the local object
 * URL rather than the server's, because the server's is a CDN address that
 * has not always finished processing by the time the tile is drawn.
 */
export function useTemplateFill(record: CampaignRecord | null): TemplateFillApi {
  const { client, botId } = useBroadcasts();
  const store = useCampaigns();
  const flowId = record?.flowId ?? null;
  const elementId = record?.payload?.elementId ?? null;
  const settingsBlockId = record?.settings.blockId ?? null;

  /* The element the list holds for this draft — seeded on the first render
     so the form draws without waiting for an effect, and adopted again only
     when the draft's payload element is another one (its kind changed). */
  const held = (): TemplateElement | null => {
    const flow = flowId ? store.flowOf(flowId) : undefined;
    return flow && settingsBlockId ? (findPayloadBlock(flow, settingsBlockId)?.element ?? null) : null;
  };
  const [state, dispatch] = useReducer(templateFillReducer, elementId, (id) => ({
    ...EMPTY_TEMPLATE_FILL,
    elementId: id,
    element: held(),
  }));
  const [headerFile, setHeaderFileState] = useState<PickedHeaderFile | null>(null);
  const upload = client.uploadFile;

  /* The store and the epoch, readable from inside a promise chain that was
     started under an earlier render. */
  const storeRef = useRef(store);
  storeRef.current = store;
  const epochRef = useRef(state.epoch);
  epochRef.current = state.epoch;

  /* One chain per field: a blur's write and an insert's write on the same
     blank go out in order, so the server holds the last one typed. */
  const chainsRef = useRef<Record<string, Promise<unknown>>>({});
  const adoptedFor = useRef(elementId);
  useEffect(() => {
    if (adoptedFor.current === elementId) return;
    adoptedFor.current = elementId;
    dispatch({ type: 'adopted', elementId, element: held() });
    // The element is read from the store at adoption time; a later store
    // change is the answer to a write this hook made, already held.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  const revokePreview = useCallback(() => {
    setHeaderFileState((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }, []);

  const pick = useCallback(
    (template: CatalogTemplate) => {
      revokePreview();
      dispatch({ type: 'picked', templateId: template.id });
    },
    [revokePreview],
  );

  /* The pick, keyed on the epoch the action bumped: one `SetTemplate` per
     pick, and an answer that lands after the next pick is inert. */
  const { epoch, picking, pickTemplateId } = state;
  useEffect(() => {
    if (!picking || !pickTemplateId || !elementId || !flowId) return;
    let cancelled = false;
    storeRef.current
      .writeBlock(`write:${elementId}:template`, flowId, async () => {
        const data = await client.mutate(BroadcastSetTemplateDocument, {
          elementID: elementId,
          templateID: pickTemplateId,
        });
        return data.whatsAppTemplateSetTemplate;
      })
      .then((block) => {
        if (cancelled) return;
        const element = templateElementOf(block);
        if (element) dispatch({ type: 'pickAnswered', epoch, element });
        else dispatch({ type: 'pickFailed', epoch, message: 'The server answered with no message block.' });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'pickFailed', epoch, message: setterProblemText(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, flowId, elementId, picking, pickTemplateId, epoch]);

  /**
   * One write, whatever the field: start, run the setter the field's kind
   * needs, land the answer or the refusal. The promise the caller gets
   * rejects with the SENTENCE, so a field can print it inline.
   */
  const write = useCallback(
    async (key: string, run: () => Promise<CampaignBlock>) => {
      if (!elementId || !flowId) return;
      const issued = epochRef.current;
      dispatch({ type: 'setStarted', epoch: issued, key });
      const prior = chainsRef.current[key] ?? Promise.resolve();
      const turn = prior
        .catch(() => undefined)
        .then(() => storeRef.current.writeBlock(`write:${elementId}:${key}`, flowId, run));
      chainsRef.current[key] = turn;
      try {
        const block = await turn;
        const element = templateElementOf(block);
        if (!element) throw new Error('The server answered with no message block.');
        dispatch({ type: 'setAnswered', epoch: issued, key, element });
      } catch (err) {
        const message = setterProblemText(err);
        dispatch({ type: 'setFailed', epoch: issued, key, message });
        throw new Error(message, { cause: err });
      }
    },
    [elementId, flowId],
  );

  const setText = useCallback(
    async (field: TemplateField, value: string) => {
      if (!elementId) return;
      const elementID = elementId;
      switch (field.kind) {
        case 'text': {
          const vars = { elementID, name: field.name, value };
          /* Three documents, three result field names; the branch is on the
             component so the answer is read off the right one. */
          return write(field.key, async () => {
            if (field.component === 'Header')
              return (await client.mutate(BroadcastSetHeaderTextDocument, vars))
                .whatsAppTemplateSetHeaderTextParamValue;
            if (field.component === 'Body')
              return (await client.mutate(BroadcastSetBodyTextDocument, vars)).whatsAppTemplateSetBodyTextParamValue;
            return (await client.mutate(BroadcastSetFooterTextDocument, vars)).whatsAppTemplateSetFooterTextParamValue;
          });
        }
        case 'urlParam':
          return write(
            field.key,
            async () =>
              (
                await client.mutate(BroadcastSetUrlButtonParamDocument, {
                  elementID,
                  buttonID: field.buttonId,
                  name: field.name,
                  value,
                })
              ).whatsAppTemplateSetURLButtonTextParamValue,
          );
        case 'copyCode':
          return write(
            field.key,
            async () =>
              (
                await client.mutate(BroadcastSetCopyCodeDocument, {
                  elementID,
                  buttonID: field.buttonId,
                  codeValue: value,
                })
              ).whatsAppTemplateSetCopyCodeButtonCodeValue,
          );
        case 'file':
          return;
      }
    },
    [client, elementId, write],
  );

  const setHeaderFile = useCallback(
    (field: TemplateField, file: File) => {
      if (!elementId || field.kind !== 'file' || !upload) return;
      const elementID = elementId;
      const mime = file.type.toLowerCase();
      const kind: AttachmentKind = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('video/')
          ? 'video'
          : mime.startsWith('audio/')
            ? 'audio'
            : 'document';
      revokePreview();
      const previewUrl = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : null;
      setHeaderFileState({ name: file.name, size: file.size, kind, previewUrl });

      /* Answered before a byte is uploaded, in the tile rather than by the
         server: a PDF picked for an image header would upload fine and then
         be refused by the setter with a sentence about content types. */
      if (field.fileKind !== 'document' && kind !== field.fileKind) {
        dispatch({
          type: 'setFailed',
          epoch: epochRef.current,
          key: field.key,
          message: `This header takes ${field.fileKind === 'image' ? 'an image' : 'a video'}, not ${kind === 'document' ? 'a document' : `${kind === 'audio' ? 'an' : 'a'} ${kind}`}.`,
        });
        return;
      }

      const wanted = field.fileKind === 'image' ? 'Image' : field.fileKind === 'video' ? 'Video' : 'Document';
      void write(field.key, async () => {
        const uploaded = await upload(botId, file, wanted);
        if (field.fileKind === 'image')
          return (await client.mutate(BroadcastSetHeaderImageDocument, { elementID, fileID: uploaded.id }))
            .whatsAppTemplateSetHeaderImageFile;
        if (field.fileKind === 'video')
          return (await client.mutate(BroadcastSetHeaderVideoDocument, { elementID, fileID: uploaded.id }))
            .whatsAppTemplateSetHeaderVideoFile;
        return (
          await client.mutate(BroadcastSetHeaderDocumentDocument, {
            elementID,
            fileID: uploaded.id,
            fileName: file.name,
          })
        ).whatsAppTemplateSetHeaderDocumentFile;
      }).catch(() => {
        /* Landed in `problems` by `write`; the tile shows it. */
      });
    },
    [client, botId, elementId, upload, write, revokePreview],
  );

  useEffect(() => () => revokePreview(), [revokePreview]);

  const template = state.element?.whatsAppTemplate ?? null;
  const fields = useMemo(() => (template ? templateFields(componentsOfConfig(template)) : NO_FIELDS), [template]);
  const errors = useMemo(
    () => (state.element && template ? attachErrors(fields, state.element.errors, problemText) : NO_ERRORS),
    [fields, state.element, template],
  );
  const refused = useMemo(() => (template ? refusedByField(template) : NO_REFUSED), [template]);
  const preview = useMemo(() => (template ? templatePreview(componentsOfConfig(template)) : null), [template]);

  return {
    state,
    template,
    fields,
    errors,
    refused,
    preview,
    canContinue: selectCanContinue(state),
    headerFile,
    canUpload: upload !== undefined,
    pick,
    setText,
    setHeaderFile,
  };
}
