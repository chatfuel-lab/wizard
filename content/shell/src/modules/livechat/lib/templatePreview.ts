import type { MessageAction } from '~ui';
import {
  WhatsAppTemplateStatus,
  type InboxFilledTemplateFragment,
  type InboxTplStrFragment,
  type InboxTplTextFragment,
  type InboxWhatsAppTemplateFragment,
} from '~api/generated/livechat/graphql';
import type { TemplateContent, TemplateHeader } from './messagePayload';

/**
 * What a WhatsApp template says, and where its blanks are.
 *
 * A template on the wire is four components — header, body, footer, buttons —
 * each a list of parts, and a part is either literal text or a named parameter
 * whose value is itself a list of parts. Nothing about that is a string, and
 * the picker, the form and the bubble each need one: the picker to show what
 * a template says before anyone fills it, the form to know which blanks exist,
 * the preview to show the message as it will land. This file turns the parts
 * into those three things, once, and nowhere near a component.
 *
 * `WhatsAppTemplate` and `FilledWhatsAppTemplate` carry the same four
 * component shapes, so every function here takes either. An unfilled
 * parameter renders as `{{name}}` — WhatsApp's own notation, and what Meta's
 * template manager shows — so a preview of a half-filled template reads as a
 * half-filled template rather than as a sentence with words missing.
 */

/** The four components, as both the catalog row and the filled copy carry them. */
export type TemplateComponents = Pick<InboxFilledTemplateFragment, 'header' | 'body' | 'footer' | 'buttons'>;

export type TemplateTextPart = NonNullable<InboxTplTextFragment['text']>[number];
type StrParts = InboxTplStrFragment['parts'];

/** `{{1}}` — the notation the operator has already seen in Meta's template manager. */
export const placeholder = (name: string): string => `{{${name}}}`;

/**
 * A `TemplateStr` as text. An attribute reference — which this inbox never
 * writes, but a template edited in the flow builder can carry — is printed as
 * its placeholder rather than resolved: the contact's value is not on the
 * wire here, and inventing one would preview a message that is not the one
 * being sent.
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

/** The value a parameter currently holds, or '' when nothing has been set. */
export function paramValue(part: TemplateTextPart): string {
  return part.__typename === 'WhatsAppTemplateComponentTextPartParam' ? strText(part.value.parts) : '';
}

/**
 * The parts as one string, with every filled parameter substituted and every
 * empty one left as its placeholder.
 */
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
        previewHeader = {
          kind: 'document',
          url: header.document?.url ?? null,
          fileName: header.fileName ?? null,
        };
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
 * The preview as the thread's `TemplateContent` — the shape `readPayload`
 * gives a `WhatsAppOutTemplateMessage`, built here from the filled copy so
 * the optimistic row and the echo are drawn by the same bubble from the same
 * fields. The button mapping mirrors `templateActions` in `messagePayload.ts`:
 * URL → link, call → phone, copy code → "text · code", the rest a title.
 *
 * `localFileName` is the picked header file's name from the operator's own
 * machine: for a document header it is the only place the name is, because
 * the filled copy's `fileName` is what was set on the server, and the picker
 * has it first. The URL is the server's — the picker's object URL is revoked
 * when the dialog closes, which is before the row is drawn.
 */
export function templateContentOf(preview: TemplatePreview, localFileName: string | null = null): TemplateContent {
  let header: TemplateHeader | null = null;
  if (preview.header) {
    if (preview.header.kind === 'text') {
      header = { kind: 'text', text: preview.header.text };
    } else {
      header = {
        kind: preview.header.kind,
        url: preview.header.url,
        name: preview.header.kind === 'document' ? (localFileName ?? preview.header.fileName) : null,
      };
    }
  }
  const actions: MessageAction[] = preview.buttons.map((button) => {
    switch (button.kind) {
      case 'url':
        return { title: button.text, href: button.url };
      case 'call':
        return { title: button.text, phone: button.phoneNumber };
      case 'copyCode':
        return { title: button.code ? `${button.text} · ${button.code}` : button.text };
      case 'quickReply':
      case 'whatsAppCall':
        return { title: button.text };
    }
  });
  return { header, body: preview.body || null, footer: preview.footer, actions };
}

/**
 * One blank the operator can fill.
 *
 * `key` is what the form, the store and the error mapping agree on: a text
 * parameter is `header:1` / `body:2` / `footer:1`, the header file is
 * `header:file`, a URL button's parameter is `button:<id>:<name>` and a copy
 * code is `code:<id>`. `component` is the schema's own name for the part, so
 * an error naming a component can find its field.
 */
export type TemplateField =
  | {
      key: string;
      kind: 'text';
      component: 'Header' | 'Body' | 'Footer';
      name: string;
      value: string;
    }
  | {
      key: string;
      kind: 'file';
      component: 'Header';
      fileKind: 'image' | 'video' | 'document';
      /** The file already set, or null. */
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
  | {
      key: string;
      kind: 'copyCode';
      component: 'Buttons';
      buttonId: string;
      buttonText: string;
      value: string;
    };

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

type FilledError = InboxFilledTemplateFragment['errors'][number];

/**
 * The server's verdict, in words. The codes are the schema's; the sentences are
 * what a field label has room for.
 */
export function errorText(code: FilledError['code'] | string): string {
  switch (code) {
    case 'TextParamRequired':
    case 'URLButtonParamRequired':
    case 'CopyCodeButtonCodeValueRequired':
      return 'Required';
    case 'FileRequired':
      return 'A file is required';
    case 'CopyCodeButtonCodeValueTooLong':
      return 'Too long';
    case 'StatusNotValidForProcessing':
      return 'This template can no longer be sent — its status changed';
    default:
      return String(code);
  }
}

export interface AttachedErrors {
  /** Field key → the sentences to print beside it. */
  byKey: Record<string, string[]>;
  /** Errors that name no field this form has — printed at the top. */
  unattached: string[];
}

/**
 * Each server error, next to the field it is about.
 *
 * `errors` on the filled template IS the send gate: the form never checks
 * completeness itself, it prints what the server said. A text-param error
 * names its component and parameter, a button error its button (and, for a
 * URL parameter, the parameter), and a generic error only its component —
 * which for a media header is enough, because that component has exactly one
 * field. Whatever names nothing this form has is still shown, above the form,
 * rather than dropped: a gate the operator cannot see is a Send button that
 * is disabled for no reason.
 */
export function attachErrors(fields: readonly TemplateField[], errors: readonly FilledError[]): AttachedErrors {
  const byKey: Record<string, string[]> = {};
  const unattached: string[] = [];
  const add = (key: string | null, text: string) => {
    if (key === null) unattached.push(text);
    else (byKey[key] ??= []).push(text);
  };
  for (const error of errors) {
    const text = errorText(error.code);
    switch (error.__typename) {
      case 'FilledWhatsAppTemplateTextParamError': {
        const component = (error.componentType ?? '').toLowerCase();
        const key = `${component}:${error.paramName}`;
        add(fields.some((field) => field.key === key) ? key : null, text);
        break;
      }
      case 'FilledWhatsAppTemplateButtonError': {
        const url = `button:${error.buttonID}:${error.paramName}`;
        const code = `code:${error.buttonID}`;
        const key = fields.some((field) => field.key === url)
          ? url
          : fields.some((field) => field.key === code)
            ? code
            : null;
        add(key, text);
        break;
      }
      case 'FilledWhatsAppTemplateGenericError': {
        const owner = fields.find((field) => field.component === error.componentType && field.kind === 'file');
        add(owner?.key ?? null, text);
        break;
      }
    }
  }
  return { byKey, unattached };
}

/** The template rows the picker offers: approved by Meta AND sendable from an inbox. */
export function sendableTemplates(
  templates: readonly InboxWhatsAppTemplateFragment[],
): InboxWhatsAppTemplateFragment[] {
  return templates.filter(
    (template) => template.IsSupportedInLivechat && template.status === WhatsAppTemplateStatus.Approved,
  );
}

/** What the picker's search box searches: the name first, then the words of the message. */
export function templateSearchTexts(template: InboxWhatsAppTemplateFragment): string[] {
  const preview = templatePreview(template);
  return [
    template.name,
    preview.body,
    template.category,
    template.language,
    preview.header?.kind === 'text' ? preview.header.text : '',
  ];
}
