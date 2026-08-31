import { useEffect, useState, type ReactNode } from 'react';
import { errorMessageFor, type TypedDoc } from '~api';
import { Button, Field, Select, Tag, type SelectOption } from '~ui';
import {
  DeleteWhatsAppTemplateDocument,
  SetWhatsAppTemplateBodyTextParamDocument,
  SetWhatsAppTemplateCopyCodeButtonCodeDocument,
  SetWhatsAppTemplateDocument,
  SetWhatsAppTemplateFooterTextParamDocument,
  SetWhatsAppTemplateHeaderDocumentFileDocument,
  SetWhatsAppTemplateHeaderImageFileDocument,
  SetWhatsAppTemplateHeaderTextParamDocument,
  SetWhatsAppTemplateHeaderVideoFileDocument,
  SetWhatsAppTemplateSaveReplyDocument,
  SetWhatsAppTemplateUrlButtonTextParamDocument,
  SetWhatsAppTemplateWaitForRepliesDocument,
  WhatsAppTemplatesCatalogDocument,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../../FlowBuilderContext';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { MediaField } from './shared/MediaField';
import { ReplySettings } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

export interface WhatsAppTemplateEditorProps {
  element: ElementOf<'WhatsAppTemplateBlockElement'>;
  onBlock: (block: BlockT) => void;
}

type TemplateOption = { id: string; name: string };

interface TplTextPart {
  __typename?: string;
  name?: unknown;
  value?: unknown;
}
type ParamDocument = TypedDoc<Record<string, unknown>, { elementID: string; name: string; value: string }>;

/** The {{param}} placeholders of one template section (name + current value). */
function textParams(
  component: { text?: readonly TplTextPart[] | null } | null | undefined,
): { name: string; value: string }[] {
  return (component?.text ?? []).flatMap((part) =>
    part.__typename === 'WhatsAppTemplateComponentTextPartParam'
      ? [
          {
            name: String(part.name),
            value: templateStrToString(part.value as Parameters<typeof templateStrToString>[0]),
          },
        ]
      : [],
  );
}

/**
 * Template pick (WhatsAppTemplatesCatalog, IsSupportedInFlowbuilder only),
 * per-section {{param}} values, header media, URL-button/copy-code params and
 * reply settings. Template CONTENT (the approved text itself) is Meta-managed
 * and read-only by design — only params and header media are editable.
 */
export function WhatsAppTemplateEditor({ element, onBlock }: WhatsAppTemplateEditorProps) {
  const { client, botId } = useFlowBuilder();
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const [catalog, setCatalog] = useState<TemplateOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const template = element.whatsAppTemplate;

  useEffect(() => {
    let cancelled = false;
    client
      .query(WhatsAppTemplatesCatalogDocument, { botID: botId, first: 100 })
      .then((data) => {
        if (cancelled) return;
        const options = (data.bot?.whatsAppTemplates?.edges ?? [])
          .map((edge) => edge.node)
          .filter((node) => node.IsSupportedInFlowbuilder)
          .map((node) => ({ id: node.id, name: `${node.name} (${node.language})` }));
        setCatalog(options);
      })
      .catch((err) => {
        if (!cancelled) setCatalogError(errorMessageFor(err, {}));
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  const paramFields = (label: string, params: { name: string; value: string }[], doc: ParamDocument) =>
    params.map((param) => (
      <Field
        key={`${label}-${param.name}`}
        label={`${label} {{${param.name}}}`}
        value={param.value}
        onSave={(value) => run(doc, { elementID: element.id, name: param.name, value }, pickBlock)}
      />
    ));

  let headerMedia: ReactNode = null;
  if (template?.header) {
    switch (template.header.__typename) {
      case 'WhatsAppTemplateComponentImage':
        headerMedia = (
          <MediaField
            elementId={element.id}
            label="Header image"
            fileType="Image"
            accept="image/*"
            current={template.header.image}
            onAttach={(fileID) =>
              run(SetWhatsAppTemplateHeaderImageFileDocument, { elementID: element.id, fileID }, pickBlock)
            }
          />
        );
        break;
      case 'WhatsAppTemplateComponentVideo':
        headerMedia = (
          <MediaField
            elementId={element.id}
            label="Header video"
            fileType="Video"
            accept="video/*"
            current={template.header.video}
            onAttach={(fileID) =>
              run(SetWhatsAppTemplateHeaderVideoFileDocument, { elementID: element.id, fileID }, pickBlock)
            }
          />
        );
        break;
      case 'WhatsAppTemplateComponentDocument':
        headerMedia = (
          <MediaField
            elementId={element.id}
            label="Header document"
            fileType="Document"
            accept="*/*"
            current={template.header.document}
            currentName={template.header.fileName}
            onAttach={(fileID, fileName) =>
              run(SetWhatsAppTemplateHeaderDocumentFileDocument, { elementID: element.id, fileID, fileName }, pickBlock)
            }
          />
        );
        break;
      default:
        break;
    }
  }

  const headerParams =
    template?.header?.__typename === 'WhatsAppTemplateComponentText' ? textParams(template.header) : [];

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-muted">Template</span>
        <Select
          className="w-full"
          aria-label="WhatsApp template"
          value={template?.templateID ?? ''}
          placeholder={catalog === null ? 'Loading templates…' : 'Choose a template…'}
          disabled={catalog === null}
          options={(catalog ?? []).map((option): SelectOption => ({ value: option.id, label: option.name }))}
          onChange={(templateID) =>
            void runAction(SetWhatsAppTemplateDocument, { elementID: element.id, templateID }, pickBlock)
          }
        />
      </label>
      {catalogError ? <p className="text-xs text-danger">{catalogError}</p> : null}
      {template ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag>{template.name}</Tag>
            <Tag tone={template.status === 'Approved' ? 'success' : 'neutral'}>{template.status}</Tag>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void runAction(DeleteWhatsAppTemplateDocument, { elementID: element.id }, pickBlock)}
            >
              Detach template
            </Button>
          </div>
          {headerMedia}
          {paramFields('Header', headerParams, SetWhatsAppTemplateHeaderTextParamDocument)}
          {paramFields('Body', textParams(template.body), SetWhatsAppTemplateBodyTextParamDocument)}
          {paramFields('Footer', textParams(template.footer), SetWhatsAppTemplateFooterTextParamDocument)}
          {(template.buttons ?? []).map((button) => {
            if (button.__typename === 'WhatsAppTemplateURLButton') {
              // The URL is itself a text-part list — its params edit like text.
              return textParams({ text: button.url as readonly TplTextPart[] }).map((param) => (
                <Field
                  key={`url-${button.id}-${param.name}`}
                  label={`URL button {{${param.name}}}`}
                  value={param.value}
                  onSave={(value) =>
                    run(
                      SetWhatsAppTemplateUrlButtonTextParamDocument,
                      { elementID: element.id, buttonID: button.id, name: param.name, value },
                      pickBlock,
                    )
                  }
                />
              ));
            }
            if (button.__typename === 'WhatsAppTemplateCopyCodeButton') {
              return (
                <Field
                  key={`code-${button.id}`}
                  label={`Copy-code button "${button.text}"`}
                  value={templateStrToString(button.code)}
                  onSave={(codeValue) =>
                    run(
                      SetWhatsAppTemplateCopyCodeButtonCodeDocument,
                      { elementID: element.id, buttonID: button.id, codeValue },
                      pickBlock,
                    )
                  }
                />
              );
            }
            return null;
          })}
        </>
      ) : null}
      <ReplySettings
        element={element}
        waitDocument={SetWhatsAppTemplateWaitForRepliesDocument}
        saveDocument={SetWhatsAppTemplateSaveReplyDocument}
        onBlock={onBlock}
      />
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
