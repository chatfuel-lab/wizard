import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Button, IconTrash, Skeleton, Tag } from '~ui';
import { elementTypeLabel } from '../lib/elementSummary';
import type { BlockT, ElementOf, ElementT } from '../types';
import { ErrorList } from './ErrorList';
import { GenericElementView } from './GenericElementView';

export interface ElementInspectorProps {
  element: ElementT;
  /** applyBlock: every setter returns the enclosing block — authoritative. */
  onBlock: (block: BlockT) => void;
  /** Deletes this element card (single card — unconfirmed, like button deletes). */
  onDelete: () => void;
  /** Full reload — for the trigger* ops that return no enclosing block. */
  onRefetch: () => Promise<void>;
}

type Typename = ElementT['__typename'];

/**
 * What every editor is handed. `refetch` is only read by the one editor whose
 * ops answer without an enclosing block (TriggeredMessage), and it is in the
 * common shape rather than special-cased so the table can be one type.
 */
interface EditorProps<E extends ElementT = ElementT> {
  element: E;
  onBlock: (block: BlockT) => void;
  refetch: () => Promise<void>;
}

/**
 * Each typename's editor, typed against THAT typename's element. Registering
 * `WhatsAppTextEditor` under `WidgetImageBlockElement` fails to compile here,
 * exactly as the wrong `case` label used to — the `switch` this replaces gave
 * that check for free through narrowing, and a table has to ask for it.
 */
type EditorTable = {
  readonly [K in Typename]?: LazyExoticComponent<ComponentType<EditorProps<ElementOf<K>>>>;
};

/**
 * Module-level, and this is load-bearing: `lazy()` returns a new component type
 * every time it is called, and a component type that changes between renders
 * is remounted by React on every render — every field would lose focus and
 * state on each keystroke.
 *
 * Twenty-one editors, each its own chunk. The old file imported all of them
 * statically, so opening one text field cost the download of the WhatsApp
 * template picker, the JSON editor and both AI agent editors. `GenericElementView`
 * stays eager on purpose: it is the fallback for typenames this bundle has never
 * heard of, and the fallback that must never fail cannot also be a fetch that
 * might.
 */
export const EDITORS: EditorTable = {
  WhatsAppTextBlockElement: lazy(() =>
    import('./editors/WhatsAppTextEditor').then((m) => ({ default: m.WhatsAppTextEditor })),
  ),
  WhatsAppImageBlockElement: lazy(() => import('./editors/WAMediaEditor').then((m) => ({ default: m.WAMediaEditor }))),
  WhatsAppVideoBlockElement: lazy(() => import('./editors/WAMediaEditor').then((m) => ({ default: m.WAMediaEditor }))),
  WhatsAppAudioBlockElement: lazy(() => import('./editors/WAMediaEditor').then((m) => ({ default: m.WAMediaEditor }))),
  WhatsAppDocumentBlockElement: lazy(() =>
    import('./editors/WAMediaEditor').then((m) => ({ default: m.WAMediaEditor })),
  ),
  WidgetTextAndButtonBlockElement: lazy(() =>
    import('./editors/WidgetTextAndButtonsEditor').then((m) => ({
      default: m.WidgetTextAndButtonsEditor,
    })),
  ),
  WidgetImageBlockElement: lazy(() =>
    import('./editors/WidgetImageEditor').then((m) => ({ default: m.WidgetImageEditor })),
  ),
  WhatsAppTextAndButtonsBlockElement: lazy(() =>
    import('./editors/WhatsAppTextAndButtonsEditor').then((m) => ({
      default: m.WhatsAppTextAndButtonsEditor,
    })),
  ),
  WhatsAppTextAndURLBlockElement: lazy(() =>
    import('./editors/WhatsAppTextAndURLEditor').then((m) => ({
      default: m.WhatsAppTextAndURLEditor,
    })),
  ),
  WhatsAppListBlockElement: lazy(() => import('./editors/WAListEditor').then((m) => ({ default: m.WAListEditor }))),
  WhatsAppTemplateBlockElement: lazy(() =>
    import('./editors/WhatsAppTemplateEditor').then((m) => ({ default: m.WhatsAppTemplateEditor })),
  ),
  SetConditionBlockElement: lazy(() =>
    import('./editors/SetConditionEditor').then((m) => ({ default: m.SetConditionEditor })),
  ),
  SetContactPropertyBlockElement: lazy(() =>
    import('./editors/ContactPropertyEditor').then((m) => ({ default: m.ContactPropertyEditor })),
  ),
  ClearContactPropertyBlockElement: lazy(() =>
    import('./editors/ClearContactPropertyEditor').then((m) => ({
      default: m.ClearContactPropertyEditor,
    })),
  ),
  RedirectToFlowBlockElement: lazy(() =>
    import('./editors/RedirectEditor').then((m) => ({ default: m.RedirectEditor })),
  ),
  SendJsonBlockElement: lazy(() => import('./editors/SendJsonEditor').then((m) => ({ default: m.SendJsonEditor }))),
  SummarizeChatBlockElement: lazy(() =>
    import('./editors/SummarizeChatEditor').then((m) => ({ default: m.SummarizeChatEditor })),
  ),
  DefaultReplyBlockElement: lazy(() =>
    import('./editors/DefaultReplyEditor').then((m) => ({ default: m.DefaultReplyEditor })),
  ),
  TriggeredMessageBlockElement: lazy(() =>
    import('./editors/TriggeredMessageEditor').then((m) => ({ default: m.TriggeredMessageEditor })),
  ),
  WhatsAppOneTimeNotificationBlockElement: lazy(() =>
    import('./editors/OneTimeNotificationEditor').then((m) => ({
      default: m.OneTimeNotificationEditor,
    })),
  ),
  WhatsAppScheduledMessageBlockElement: lazy(() =>
    import('./editors/ScheduledMessageEditor').then((m) => ({ default: m.ScheduledMessageEditor })),
  ),
  FuelyAIAgentBlockElement: lazy(() =>
    import('./editors/FuelyAIAgentEditor').then((m) => ({ default: m.FuelyAIAgentEditor })),
  ),
  AiAgentBlockElement: lazy(() =>
    import('./editors/AiAgentLegacyEditor').then((m) => ({ default: m.AiAgentLegacyEditor })),
  ),
  AiAgentCustomBlockElement: lazy(() =>
    import('./editors/AiAgentCustomEditor').then((m) => ({ default: m.AiAgentCustomEditor })),
  ),
};

/**
 * What the panel shows for the round trip that fetches an editor's chunk. Three
 * field-shaped bars, because that is what nearly every editor turns into, and
 * a spinner where a form is about to appear reads as the form having failed.
 */
function EditorFallback() {
  return (
    <div className="space-y-3">
      <span className="sr-only" role="status">
        Loading editor
      </span>
      <Skeleton variant="block" height="2.25rem" />
      <Skeleton variant="block" height="2.25rem" />
      <Skeleton variant="block" height="2.25rem" width="60%" />
    </div>
  );
}

/**
 * Dispatch on __typename: a dedicated editor for every element type with
 * editable fields (full coverage), GenericElementView for the
 * setter-less rest (widget entry point, the four switch-to-human variants)
 * AND for typenames this bundle has never heard of — the canvas and
 * inspector must never crash on unknown content.
 */
export function ElementInspector({ element, onBlock, onDelete, onRefetch }: ElementInspectorProps) {
  /* The table is keyed by typename and every entry was registered against that
     typename's element, so this element IS the one the editor accepts. The
     correlation is real; it is just not one TypeScript can carry through an
     indexed lookup on a union, hence the widening here and nowhere else. */
  const Editor = EDITORS[element.__typename] as LazyExoticComponent<ComponentType<EditorProps>> | undefined;

  // segmentErrors are validation state too — fold them into the same list
  // (locator: "audience filter" / "whole audience segment").
  const segmentErrors =
    'segmentErrors' in element
      ? (element.segmentErrors ?? []).map((e) => ({ code: e.code, filterID: e.filterID }))
      : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Tag tone="accent">{elementTypeLabel(element.__typename)}</Tag>
        <Button variant="ghost" size="sm" aria-label="Delete element" onClick={onDelete}>
          <IconTrash size={13} />
        </Button>
      </div>
      {Editor ? (
        <Suspense fallback={<EditorFallback />}>
          <Editor element={element} onBlock={onBlock} refetch={onRefetch} />
        </Suspense>
      ) : (
        <GenericElementView element={element} />
      )}
      <ErrorList errors={[...(element.errors ?? []), ...segmentErrors]} />
    </div>
  );
}
