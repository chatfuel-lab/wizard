import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import { resolvePosition, type Placement, type PositionResult } from '../lib/geometry/position';

export interface UseAnchoredPositionOptions {
  placement?: Placement;
  offset?: number;
  padding?: number;
  /** Force the floating element to the anchor's width (comboboxes, selects). */
  matchAnchorWidth?: boolean;
}

/**
 * Positions a floating element against an anchor.
 *
 * Two rules that are not stylistic and must not be relaxed:
 *
 * 1. The floating element is `position: fixed`. All the math is in viewport
 *    coordinates straight off getBoundingClientRect, which sidesteps
 *    offsetParent arithmetic — the thing hand-rolled positioners actually die on.
 *
 * 2. The floating element MUST be portalled to the body. A `transform`,
 *    `filter` or `contain` ancestor becomes the containing block for
 *    position:fixed and silently breaks rule 1. This is not hypothetical here:
 *    the flow-builder renders inside a transformed React Flow canvas.
 *
 * The anchor is a ref and the floating element is the ELEMENT — held in state
 * behind a callback ref — and the asymmetry is the point. The anchor is in the
 * DOM before `open` flips; a ref read in the effect finds it. The floating
 * element is portalled and mounts commits later (`Portal` resolves its host in
 * an effect, `usePresence` mounts a render after `open`), so an effect keyed on
 * `open` runs before it exists: a ref read then is null, the effect bails, and
 * nothing re-runs it — the whole open cycle would hang on the ResizeObserver
 * happening to report for the anchor. Passing the element as state puts its
 * arrival in the dependency list, so the effect re-arms on the commit that has
 * something to measure, and measures it in that same layout effect — before
 * paint, no hidden frame.
 *
 * Returns null until the element has been measured. Render it with
 * `visibility: hidden` for that first pass so nothing is seen flying in from
 * the top-left corner.
 */
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floating: HTMLElement | null,
  open: boolean,
  options?: UseAnchoredPositionOptions,
): PositionResult | null {
  const { placement = 'bottom-start', offset, padding, matchAnchorWidth } = options ?? {};
  const [position, setPosition] = useState<PositionResult | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    /* Anchor gone (a ContextMenu unmounts its point anchor on close) — keep the
     * last position rather than snapping to the corner mid-exit. */
    if (!anchor || !floating) return;

    const anchorRect = anchor.getBoundingClientRect();
    if (matchAnchorWidth) floating.style.width = `${anchorRect.width}px`;

    /* visualViewport tracks the iOS software keyboard; innerWidth does not. */
    const viewport = {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    };

    setPosition(
      resolvePosition({
        anchor: {
          x: anchorRect.x,
          y: anchorRect.y,
          width: anchorRect.width,
          height: anchorRect.height,
        },
        floating: { width: floating.offsetWidth, height: floating.offsetHeight },
        viewport,
        placement,
        offset,
        padding,
      }),
    );
  }, [anchorRef, floating, placement, offset, padding, matchAnchorWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    /* Synchronous, on the commit that mounted the floating element: this is
     * the measurement the first paint uses. Everything below only re-measures. */
    update();

    /* One rAF-coalesced handler for every source of movement. */
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    /* capture:true is what catches ANCESTOR scroll containers — a menu
     * anchored to a row inside an overflow-y-auto panel. A bubbling listener
     * on window never sees those. */
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);

    /* Both boxes: the anchor moves the surface, and the surface's OWN size
     * changes where it lands — a combobox list narrowing as the query filters
     * it, a popover growing a validation line. */
    const observer = new ResizeObserver(schedule);
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (floating) observer.observe(floating);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [open, update, anchorRef, floating]);

  return position;
}
