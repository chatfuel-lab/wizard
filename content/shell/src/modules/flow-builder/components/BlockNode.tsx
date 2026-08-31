import { memo } from 'react';
import { CanvasHandle, IconPlay, IconWarning, Tag } from '~ui';
import { blockErrorCount, blockTypeLabel, describeElement, elementErrorCount } from '../lib/elementSummary';
import { cardVisual, elementVisual } from '../lib/blockVisuals';
import { BLOCK_SOURCE_HANDLE, encodeHandleId, extractHandles, type GraphNodeData } from '../lib/graph';
import { BlockGlyph, OutletRow } from './BlockGlyph';
import { useSelection } from './selectionContext';

/**
 * One block on the canvas.
 *
 * ## Selection is the parent's business
 *
 * The card draws its selected and dragging states from `group-data-*`, which
 * means the attributes live on `CanvasNode` — one level up — and this file reads
 * them rather than owning them. That is what lets a marquee, a click and a deep
 * link all produce the same look: the canvas decides what is selected, in one
 * place, and the card only decides how selected looks.
 *
 * It is a RING and not a border swap. Widening a border relayouts the card and
 * every handle offset measured against it; a ring is painted outside the box
 * and moves nothing. That matters more here than it usually would, because the
 * edge layer's start and end points are measured pip centres.
 *
 * ## Errors read on the card, not only in a badge
 *
 * A count in the corner is invisible on a canvas at 40% zoom. The card itself
 * takes a danger border, so a broken block is findable while zoomed out far
 * enough that no text is legible at all — which is the zoom people actually
 * scan a flow at.
 *
 * ## A refused action and a broken block are different news
 *
 * `errorCount` is the server's validation verdict about what this block IS:
 * stable, it survives a reload, and it is the block's own problem. `actionError`
 * is something the user just tried to DO to this block and did not get: a move
 * the server rejected, a connection it refused. It is about the request, not
 * about the block, and a reload makes it moot.
 *
 * So they get different colours — danger against warning — and the warning
 * carries words rather than a count, because "what went wrong" has no useful
 * short form. Danger wins the border when a block has both: a block that cannot
 * run matters more than a request that did not land, and the failed request is
 * still stated in full a line below.
 */
export const BlockNode = memo(function BlockNode({
  data,
  actionError,
  connecting = false,
}: {
  data: GraphNodeData;
  /** The last thing asked of this block that the server refused. */
  actionError?: string;
  /**
   * The Connect tool's first click landed here and is waiting for the second.
   * A dashed accent ring rather than the selection's solid one, so "where the
   * line will come from" and "what is selected" read as different states.
   */
  connecting?: boolean;
}) {
  const { selection, select } = useSelection();
  const { block, hasNextEdge } = data;
  const isStartingPoint = 'isStartingPoint' in block && block.isStartingPoint;
  const errorCount = blockErrorCount(block);
  const visual = cardVisual(
    block.__typename,
    block.blockElements.map((element) => element.__typename),
  );

  return (
    <div
      onClick={() => select({ blockId: block.id, elementId: null })}
      className={`relative w-64 cursor-pointer rounded-xl border bg-surface-raised shadow-sm transition-shadow hover:shadow-md group-data-[dragging]:shadow-lg group-data-[selected]:ring-2 group-data-[selected]:ring-accent ${
        errorCount > 0 ? 'border-danger' : actionError ? 'border-warning' : 'border-border'
      } ${connecting ? 'outline-dashed outline-2 outline-offset-4 outline-accent' : ''}`}
    >
      <CanvasHandle
        nodeId={block.id}
        side="left"
        type="target"
        label={`Incoming connections to ${block.name}`}
        className="absolute -left-1.5 top-5"
      />

      <div className="flex items-start gap-2 px-3 pb-2 pt-3">
        <BlockGlyph glyph={visual.glyph} tone={visual.tone} variant="card" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-sm font-medium leading-5 text-text">{block.name}</span>
            {errorCount > 0 ? (
              <Tag tone="danger">
                <IconWarning size={11} />
                <span className="ml-0.5">{errorCount}</span>
              </Tag>
            ) : null}
          </div>
          <span className="block truncate text-micro text-text-muted">{blockTypeLabel(block.__typename)}</span>
        </div>
      </div>

      {/* Above the tags and the elements, directly under the name: this is the
          most recent thing that happened to this block, and the reader is
          looking at the card because of it. `title` carries the server's whole
          sentence — the strip truncates, and a rejection can be a paragraph. */}
      {actionError ? (
        <div
          role="status"
          title={actionError}
          className="mx-3 mb-2 flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-1 text-micro text-warning"
        >
          <IconWarning size={11} className="shrink-0" />
          <span className="truncate">{actionError}</span>
        </div>
      ) : null}

      {isStartingPoint || 'isEntryPointEnabled' in block ? (
        <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
          {isStartingPoint ? (
            <Tag tone="accent">
              <IconPlay size={11} />
              <span className="ml-0.5">Start</span>
            </Tag>
          ) : null}
          {'isEntryPointEnabled' in block ? (
            <Tag tone={block.isEntryPointEnabled ? 'success' : 'neutral'}>
              {block.isEntryPointEnabled ? 'Entry point on' : 'Entry point off'}
            </Tag>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1 px-2 pb-2">
        {block.blockElements.map((element) => {
          const { label, summary } = describeElement(element);
          const handles = extractHandles(element);
          const elementErrors = elementErrorCount(element);
          const elementLook = elementVisual(element.__typename);
          const isElementSelected = selection?.blockId === block.id && selection?.elementId === element.id;
          return (
            <div
              key={element.id}
              onClick={(event) => {
                event.stopPropagation();
                select({ blockId: block.id, elementId: element.id });
              }}
              className={`rounded-lg border px-2 py-1.5 transition-colors ${
                isElementSelected
                  ? 'border-accent bg-accent-soft'
                  : 'border-transparent bg-surface-sunken hover:border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                <BlockGlyph glyph={elementLook.glyph} tone={elementLook.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium leading-5 text-text">{label}</span>
                    {elementErrors > 0 ? (
                      <Tag tone="danger">
                        <IconWarning size={10} />
                        <span className="ml-0.5">{elementErrors}</span>
                      </Tag>
                    ) : null}
                  </div>
                  {summary ? <div className="truncate text-micro text-text-muted">{summary}</div> : null}
                </div>
              </div>
              {handles.map((handle) => (
                <OutletRow
                  key={handle.id}
                  blockId={block.id}
                  handleId={encodeHandleId(element.id, handle.id)}
                  label={handle.label}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* The block-level "next" outlet, on the card's own bottom edge rather
          than beside an element, because that is what it means: after all of
          this, go there. Dimmed until something leaves — hiding it would make
          block-level chaining discoverable only by people who already know
          about it. */}
      <div className="relative flex items-center justify-end gap-1.5 border-t border-border-subtle px-3 py-1.5">
        <span className={`text-micro ${hasNextEdge ? 'text-text-muted' : 'text-text-faint'}`}>Next</span>
        <CanvasHandle
          nodeId={block.id}
          id={BLOCK_SOURCE_HANDLE}
          side="right"
          type="source"
          label={`Next block after ${block.name}`}
          className={`absolute -right-1.5 top-1/2 -translate-y-1/2 ${hasNextEdge ? '' : 'opacity-50'}`}
        />
      </div>
    </div>
  );
});
