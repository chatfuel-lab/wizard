import { Button, Field, IconPlay, IconWarning, InspectorHost, Switch, Tag } from '~ui';
import { RenameBlockDocument, SortElementsDocument } from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';
import { blockErrorCount, blockTypeLabel, describeElement, elementErrorCount } from '../lib/elementSummary';
import type { BlockT, FlowT, Selection } from '../types';
import { AddElementMenu } from './AddElementMenu';
import { ElementInspector } from './ElementInspector';
import { useSelection } from './selectionContext';
import { useBlockMutation } from './editors/useBlockMutation';

export interface InspectorPanelProps {
  flow: FlowT;
  block: BlockT;
  selection: Selection;
  onBlock: (block: BlockT) => void;
  onPatchBlock: (blockId: string, patch: Partial<Pick<BlockT, 'name'>>) => void;
  /** Opens the shared confirm dialog — block deletes are always confirmed. */
  onRequestDeleteBlock: (blockId: string) => void;
  /** Deletes the selected element card (single card — no confirm). */
  onDeleteElement: (elementId: string) => void;
  /** Full reload — trigger* ops return no enclosing block to reconcile from. */
  onRefetch: () => Promise<void>;
  onSetStartingPoint: (blockId: string) => void;
  /** Throws on failure so the Switch shows the server's message inline. */
  onSetEntryPoint: (blockId: string, enabled: boolean) => Promise<void>;
}

/**
 * Right side panel: block inspector, or the selected element's editor.
 *
 * The chrome — width, border, title row, close button, Escape, focus in and
 * focus back out — is InspectorHost's now. This component had none of the
 * keyboard half and never could have had it cheaply: an inline column gets no
 * Escape for free, and a handler is unreachable unless focus is moved into the
 * column first, because a click on a canvas node leaves focus on the node.
 *
 * `open` is a constant because the mount IS the open transition: FlowEditor
 * renders this only while a block is selected, so mounting arms the host's
 * focus move and unmounting runs its focus return. The one thing that buys
 * nothing is the Drawer's slide animation below the collapse band — the host
 * cannot animate a panel out while its content is already gone. That matches
 * what this panel did before (appear and disappear outright), so nothing
 * regresses; it is just not the improvement the Drawer could be.
 */
export function InspectorPanel({
  flow,
  block,
  selection,
  onBlock,
  onPatchBlock,
  onRequestDeleteBlock,
  onDeleteElement,
  onRefetch,
  onSetStartingPoint,
  onSetEntryPoint,
}: InspectorPanelProps) {
  const { select } = useSelection();
  const element = selection.elementId ? block.blockElements.find((el) => el.id === selection.elementId) : undefined;

  return (
    <InspectorHost
      open
      onClose={() => select(null)}
      title={element ? 'Element' : block.name}
      width="inspector"
      /* From 'wide', not the 'inline' default: a 20rem column still leaves a
         workable canvas at 900px, and this panel is inline at every width
         today — falling back to a Drawer at 1280 would take the inspector away
         from an ordinary desktop window that has room for it. Below 900px the
         canvas has no room to give, and the Drawer is the honest answer. */
      inlineFrom="wide"
    >
      <div className="p-gutter">
        {element ? (
          <>
            <button
              type="button"
              onClick={() => select({ blockId: block.id, elementId: null })}
              className="mb-3 block max-w-full truncate text-meta text-text-muted hover:text-text"
            >
              ← {block.name}
            </button>
            <ElementInspector
              key={element.id}
              element={element}
              onBlock={onBlock}
              onDelete={() => onDeleteElement(element.id)}
              onRefetch={onRefetch}
            />
          </>
        ) : (
          <BlockInspector
            flow={flow}
            block={block}
            onBlock={onBlock}
            onPatchBlock={onPatchBlock}
            onRequestDeleteBlock={onRequestDeleteBlock}
            onSetStartingPoint={onSetStartingPoint}
            onSetEntryPoint={onSetEntryPoint}
          />
        )}
      </div>
    </InspectorHost>
  );
}

function BlockInspector({
  flow,
  block,
  onBlock,
  onPatchBlock,
  onRequestDeleteBlock,
  onSetStartingPoint,
  onSetEntryPoint,
}: {
  flow: FlowT;
  block: BlockT;
  onBlock: InspectorPanelProps['onBlock'];
  onPatchBlock: InspectorPanelProps['onPatchBlock'];
  onRequestDeleteBlock: InspectorPanelProps['onRequestDeleteBlock'];
  onSetStartingPoint: InspectorPanelProps['onSetStartingPoint'];
  onSetEntryPoint: InspectorPanelProps['onSetEntryPoint'];
}) {
  const { client } = useFlowBuilder();
  const { select } = useSelection();
  const { runAction, actionError } = useBlockMutation(onBlock);
  const isStartingPoint = 'isStartingPoint' in block && block.isStartingPoint;
  const hasEntryPoint = 'isEntryPointEnabled' in block;
  const errorCount = blockErrorCount(block);
  const elements = block.blockElements;

  const reorderElements = (from: number, to: number) => {
    const ordered = elements.map((el) => el.id);
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved!);
    // sortBlockElements wants the FULL ordered id list, not a delta.
    void runAction(SortElementsDocument, { blockID: block.id, elementIDs: ordered }, (d) => d.sortBlockElements);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        <Tag>{blockTypeLabel(block.__typename)}</Tag>
        {isStartingPoint ? <Tag tone="accent">Starting point</Tag> : null}
        {hasEntryPoint ? (
          <Tag tone={block.isEntryPointEnabled ? 'success' : 'neutral'}>
            Entry point {block.isEntryPointEnabled ? 'on' : 'off'}
          </Tag>
        ) : null}
      </div>
      <Field
        label="Block name"
        value={block.name}
        validate={(name) => (name.trim() ? null : 'Name is required')}
        onSave={async (name) => {
          const data = await client.mutate(RenameBlockDocument, {
            flowID: flow.id,
            blockID: block.id,
            name: name.trim(),
          });
          const renamed = data.updateBlockName;
          if (renamed) onPatchBlock(block.id, { name: renamed.name });
        }}
      />
      {'isStartingPoint' in block && !block.isStartingPoint ? (
        <Button variant="ghost" size="sm" onClick={() => onSetStartingPoint(block.id)}>
          <IconPlay size={13} /> Set as starting point
        </Button>
      ) : null}
      {hasEntryPoint ? (
        <div className="space-y-1.5">
          <Switch
            checked={block.isEntryPointEnabled}
            label="Entry point"
            onChange={(next) => onSetEntryPoint(block.id, next)}
          />
          {!block.isEntryPointEnabled && errorCount > 0 ? (
            <p className="flex items-start gap-1 text-xs text-warning">
              <IconWarning size={12} className="mt-0.5 shrink-0" />
              <span>
                {errorCount} validation error{errorCount === 1 ? '' : 's'} block enabling — fix the elements below
                first.
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-text-muted">Elements</div>
        {elements.length === 0 ? (
          <p className="text-xs text-text-faint">This block has no elements.</p>
        ) : (
          elements.map((element, index) => {
            const { label, summary } = describeElement(element);
            const errors = elementErrorCount(element);
            return (
              <div
                key={element.id}
                className="flex w-full items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:border-accent"
              >
                <button
                  type="button"
                  onClick={() => select({ blockId: block.id, elementId: element.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-xs font-medium text-text">{label}</span>
                  {summary ? <span className="block truncate text-xs text-text-muted">{summary}</span> : null}
                </button>
                {errors > 0 ? <Tag tone="danger">{errors}</Tag> : null}
                {elements.length > 1 ? (
                  <span className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      aria-label="Move element up"
                      onClick={() => reorderElements(index, index - 1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === elements.length - 1}
                      aria-label="Move element down"
                      onClick={() => reorderElements(index, index + 1)}
                    >
                      ↓
                    </Button>
                  </span>
                ) : null}
              </div>
            );
          })
        )}
        {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
        <AddElementMenu block={block} onBlock={onBlock} />
      </div>
      <div className="border-t border-border pt-3">
        <Button variant="danger" size="sm" onClick={() => onRequestDeleteBlock(block.id)}>
          Delete block
        </Button>
      </div>
    </div>
  );
}
