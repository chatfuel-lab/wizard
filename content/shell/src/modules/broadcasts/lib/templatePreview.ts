/**
 * What a WhatsApp template says, and where its blanks are.
 *
 * A template on the wire is four components — header, body, footer, buttons —
 * each a list of parts, and a part is either literal text or a named parameter
 * whose value is itself a list of parts. Nothing about that is a string, and
 * the catalog, the composer and the preview each need one. This file turns
 * the parts into those things, once, and nowhere near a component.
 *
 * A copy of the livechat module's `lib/templatePreview.ts` re-keyed for the
 * flow-block twins: the catalog row (`WhatsAppTemplate`) and the payload
 * block's copy (`WhatsAppTemplateConfig`) carry the same four shapes, and the
 * verdicts come from the block element's `errors` rather than from a filled
 * copy. An unfilled parameter renders as `{{name}}` — WhatsApp's own notation.
 */
import { WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import type {
  BroadcastTplConfigHeaderFragment,
  BroadcastTplHeaderFragment,
  BroadcastTplStrFragment,
  BroadcastTplTextFragment,
} from '~api/generated/broadcasts/graphql';
import type { CatalogTemplate, ElementError, TemplateConfig } from '../types';

/** The four components, as both the catalog row and the payload copy carry them. */
export type TemplateComponents = {
  header?: BroadcastTplHeaderFragment | BroadcastTplConfigHeaderFragment | null;
  body: CatalogTemplate['body'];
  footer?: CatalogTemplate['footer'];
  buttons: CatalogTemplate['buttons'];
};

export type TemplateTextPart = NonNullable<BroadcastTplTextFragment['text']>[number];
type StrParts = BroadcastTplStrFragment['parts'];

/** `{{1}}` — the notation the person has already seen in Meta's template manager. */
export const placeholder = (name: string): string => `{{${name}}}`;

/**
 * A `TemplateStr` as text. An attribute reference prints as `{{Attribute
 * name}}`: the contact's value is not on the wire, and inventing one would
 * preview a message that is not the one being sent.
 */
export function strText(parts: StrParts | null | undefined): string {
  if (!parts) return '';
  let out = '';
  for (const part of parts) {
    if (part.__typename === 'TemplateStrText') out += part.text;
    else out += placeholder(part.attribute.name);
  }
  return out;
}

/** The attribute references a value carries that the server refused, by name. */
export function refusedAttributes(parts: StrParts | null | undefined): string[] {
  if (!parts) return [];
  return parts.flatMap((part) =>
    part.__typename === 'TemplateStrAttribute' && part.errCode ? [part.attribute.name] : [],
  );
}

/** The value a parameter currently holds, or '' when nothing has been set. */
export function paramValue(part: TemplateTextPart): string {
  return part.__typename === 'WhatsAppTemplateComponentTextPartParam' ? strText(part.value.parts) : '';
}

/** The parts as one string, filled parameters substituted, empty ones left as placeholders. */
export function renderParts(parts: readonly TemplateTextPart[] | null | undefined): string {
  if (!parts) return '';
  let out = '';
  for (const part of parts) {
    if (part.__typename === 'WhatsAppTemplateComponentTextPartText') {
      out += part.text ?? '';
    } else {
      const value = strText(part.value.parts);
      out += value === '' ? placeholder(part.name) : value;
    }
  }
  return out;
}

export type PreviewHeader =
  | { kind: 'text'; text: string }
  | { kind: 'image' | 'video' | 'document'; url: string | null; fileName: string | null };

export type PreviewButton =
  | { kind: 'url'; text: string; url: string }
  | { kind: 'quickReply'; text: string }
  | { kind: 'call'; text: string; phoneNumber: string }
  | { kind: 'whatsAppCall'; text: string }
  | { kind: 'copyCode'; text: string; code: string | null };

export interface TemplatePreview {
  header: PreviewHeader | null;
  body: string;
  footer: string | null;
  buttons: PreviewButton[];
}

/** The template as it will land, blanks and all. */
export function templatePreview(template: TemplateComponents): TemplatePreview {
  const { header } = template;
  let previewHeader: PreviewHeader | null = null;
  if (header) {
    switch (header.__typename) {
      case 'WhatsAppTemplateComponentText':
        previewHeader = { kind: 'text', text: renderParts(header.text) };
        break;
      case 'WhatsAppTemplateComponentImage':
        previewHeader = { kind: 'image', url: header.image?.url ?? null, fileName: null };
        break;
      case 'WhatsAppTemplateComponentVideo':
        previewHeader = { kind: 'video', url: header.video?.url ?? null, fileName: null };
        break;
      case 'WhatsAppTemplateComponentDocument':
        previewHeader = { kind: 'document', url: header.document?.url ?? null, fileName: header.fileName ?? null };
        break;
    }
  }

  const buttons: PreviewButton[] = [];
  for (const button of template.buttons) {
    switch (button.__typename) {
      case 'WhatsAppTemplateURLButton':
        buttons.push({ kind: 'url', text: button.text, url: renderParts(button.url) });
        break;
      case 'WhatsAppTemplateQuickReplyButton':
        buttons.push({ kind: 'quickReply', text: button.text });
        break;
      case 'WhatsAppTemplateCallPhoneButton':
        buttons.push({ kind: 'call', text: button.text, phoneNumber: button.phoneNumber });
        break;
      case 'WhatsAppTemplateWhatsAppCallButton':
        buttons.push({ kind: 'whatsAppCall', text: button.text });
        break;
      case 'WhatsAppTemplateCopyCodeButton': {
        const code = strText(button.code.parts);
        buttons.push({ kind: 'copyCode', text: button.text, code: code === '' ? null : code });
        break;
      }
    }
  }

  return {
    header: previewHeader,
    body: renderParts(template.body.text),
    footer: template.footer ? renderParts(template.footer.text) : null,
    buttons,
  };
}

/**
 * One blank the composer can fill.
 *
 * `key` is what the form, the store and the error mapping agree on: a text
 * parameter is `header:1` / `body:2` / `footer:1`, the header file is
 * `header:file`, a URL button's parameter is `button:<id>:<name>` and a copy
 * code is `code:<id>`.
 */
export type TemplateField =
  | { key: string; kind: 'text'; component: 'Header' | 'Body' | 'Footer'; name: string; value: string }
  | {
      key: string;
      kind: 'file';
      component: 'Header';
      fileKind: 'image' | 'video' | 'document';
      file: { url: string; fileName: string | null } | null;
    }
  | {
      key: string;
      kind: 'urlParam';
      component: 'Buttons';
      buttonId: string;
      buttonText: string;
      name: string;
      value: string;
    }
  | { key: string; kind: 'copyCode'; component: 'Buttons'; buttonId: string; buttonText: string; value: string };

const textFields = (
  parts: readonly TemplateTextPart[] | null | undefined,
  component: 'Header' | 'Body' | 'Footer',
): TemplateField[] => {
  const fields: TemplateField[] = [];
  const seen = new Set<string>();
  for (const part of parts ?? []) {
    if (part.__typename !== 'WhatsAppTemplateComponentTextPartParam') continue;
    /* The same `{{1}}` can appear twice in a body; it is one parameter. */
    if (seen.has(part.name)) continue;
    seen.add(part.name);
    fields.push({
      key: `${component.toLowerCase()}:${part.name}`,
      kind: 'text',
      component,
      name: part.name,
      value: paramValue(part),
    });
  }
  return fields;
};

/** Every blank in the template, in reading order: header, body, footer, buttons. */
export function templateFields(template: TemplateComponents): TemplateField[] {
  const fields: TemplateField[] = [];
  const { header } = template;
  if (header) {
    if (header.__typename === 'WhatsAppTemplateComponentText') {
      fields.push(...textFields(header.text, 'Header'));
    } else {
      const fileKind =
        header.__typename === 'WhatsAppTemplateComponentImage'
          ? 'image'
          : header.__typename === 'WhatsAppTemplateComponentVideo'
            ? 'video'
            : 'document';
      const file =
        header.__typename === 'WhatsAppTemplateComponentImage'
          ? header.image
          : header.__typename === 'WhatsAppTemplateComponentVideo'
            ? header.video
            : header.document;
      fields.push({
        key: 'header:file',
        kind: 'file',
        component: 'Header',
        fileKind,
        file: file
          ? {
              url: file.url,
              fileName: header.__typename === 'WhatsAppTemplateComponentDocument' ? (header.fileName ?? null) : null,
            }
          : null,
      });
    }
  }
  fields.push(...textFields(template.body.text, 'Body'));
  if (template.footer) fields.push(...textFields(template.footer.text, 'Footer'));
  for (const button of template.buttons) {
    if (button.__typename === 'WhatsAppTemplateURLButton') {
      const seen = new Set<string>();
      for (const part of button.url ?? []) {
        if (part.__typename !== 'WhatsAppTemplateComponentTextPartParam') continue;
        if (seen.has(part.name)) continue;
        seen.add(part.name);
        fields.push({
          key: `button:${button.id}:${part.name}`,
          kind: 'urlParam',
          component: 'Buttons',
          buttonId: button.id,
          buttonText: button.text,
          name: part.name,
          value: paramValue(part),
        });
      }
    } else if (button.__typename === 'WhatsAppTemplateCopyCodeButton') {
      fields.push({
        key: `code:${button.id}`,
        kind: 'copyCode',
        component: 'Buttons',
        buttonId: button.id,
        buttonText: button.text,
        value: strText(button.code.parts),
      });
    }
  }
  return fields;
}

/** The form label for a blank: which component it belongs to, in WhatsApp's own notation. */
export function fieldLabel(field: TemplateField): string {
  switch (field.kind) {
    case 'text':
      return `${field.component} {{${field.name}}}`;
    case 'urlParam':
      return `“${field.buttonText}” link {{${field.name}}}`;
    case 'copyCode':
      return `“${field.buttonText}” code`;
    case 'file':
      return `Header ${field.fileKind}`;
  }
}

export interface AttachedErrors {
  /** Field key → the sentences to print beside it. */
  byKey: Record<string, string[]>;
  /** Errors that name no field this form has — printed at the top. */
  unattached: string[];
}

const componentOfCode = (code: string): 'header' | 'body' | 'footer' | null => {
  if (code.startsWith('header_')) return 'header';
  if (code.startsWith('body_')) return 'body';
  if (code.startsWith('footer_')) return 'footer';
  return null;
};

/**
 * Each server verdict, next to the field it is about.
 *
 * The block element's `errors` IS the gate: the form never checks
 * completeness itself, it prints what the server said. A parameter verdict
 * names its parameter and, through the code's prefix, its component; a URL
 * button verdict names its button and parameter; a header-file verdict names
 * the header. Whatever names nothing this form has is still shown, above the
 * form, rather than dropped.
 */
export function attachErrors(
  fields: readonly TemplateField[],
  errors: readonly ElementError[],
  text: (code: string, paramName?: string | null) => string,
): AttachedErrors {
  const byKey: Record<string, string[]> = {};
  const unattached: string[] = [];
  const add = (key: string | null, sentence: string) => {
    if (key === null) unattached.push(sentence);
    else (byKey[key] ??= []).push(sentence);
  };
  const has = (key: string) => fields.some((field) => field.key === key);
  for (const error of errors) {
    switch (error.__typename) {
      case 'WhatsAppTemplateParamValueRequiredError': {
        const component = componentOfCode(error.code);
        const key = component ? `${component}:${error.paramName}` : null;
        add(key && has(key) ? key : null, text(error.code, error.paramName));
        break;
      }
      case 'WhatsAppTemplateURLButtonParamValueRequiredError': {
        const key = `button:${error.buttonID}:${error.paramName}`;
        add(has(key) ? key : null, text(error.code, error.paramName));
        break;
      }
      default: {
        if (error.code.startsWith('copy_code'))
          add(fields.find((field) => field.kind === 'copyCode')?.key ?? null, text(error.code));
        else if (error.code.startsWith('header_') && has('header:file')) add('header:file', text(error.code));
        else add(null, text(error.code));
      }
    }
  }
  return { byKey, unattached };
}

/**
 * The rows the composer offers: approved by Meta AND supported by the flow
 * builder, because a campaign is a flow. Everything else stays in the
 * catalog with its status showing.
 */
export function sendableTemplates(templates: readonly CatalogTemplate[]): CatalogTemplate[] {
  return templates.filter(
    (template) => template.IsSupportedInFlowbuilder && template.status === WhatsAppTemplateStatus.Approved,
  );
}

/** What the search box searches: the name first, then the words of the message. */
export function templateSearchTexts(template: CatalogTemplate): string[] {
  const preview = templatePreview(template);
  return [
    template.name,
    preview.body,
    template.category,
    template.language,
    preview.header?.kind === 'text' ? preview.header.text : '',
  ];
}

/** The payload copy, shaped like a catalog row for everything that previews. */
export function componentsOfConfig(config: TemplateConfig): TemplateComponents {
  return { header: config.header ?? null, body: config.body, footer: config.footer ?? null, buttons: config.buttons };
}
