import { describe, expect, it } from 'vitest';
import { beginGridDrag, endGridDrag, gridDragTo, gridKeyStep, spanEquals, type GridDragRules } from './gridDrag';

const RULES: GridDragRules = {
  snap: 15,
  minDuration: 15,
  range: { start: 0, end: 1440 },
  columnCount: 7,
};

const WORK: GridDragRules = { ...RULES, range: { start: 480, end: 1200 } };

const move = (rules = RULES) =>
  beginGridDrag({
    kind: 'move',
    id: 'e1',
    span: { column: 2, start: 550, end: 610 }, // 09:10–10:10, deliberately off-grid
    at: { column: 2, minute: 570 },
    rules,
  });

describe('beginGridDrag', () => {
  it('starts unmoved with current === origin', () => {
    const state = move();
    expect(state.moved).toBe(false);
    expect(spanEquals(state.current, state.origin)).toBe(true);
    expect(state.anchor).toEqual({ column: 2, minute: 570 });
    expect(endGridDrag(state)).toBeNull();
  });

  it('clamps the column into the grid', () => {
    const state = beginGridDrag({
      kind: 'move',
      id: 'e',
      span: { column: 9, start: 0, end: 60 },
      at: { column: 9, minute: 0 },
      rules: RULES,
    });
    expect(state.origin.column).toBe(6);
  });

  it('a create starts as a zero-length span at the floored anchor slot', () => {
    const state = beginGridDrag({
      kind: 'create',
      id: null,
      span: { column: 1, start: 0, end: 0 },
      at: { column: 1, minute: 607 },
      rules: RULES,
    });
    expect(state.origin).toEqual({ column: 1, start: 600, end: 600 });
    expect(state.anchor.minute).toBe(607);
  });
});

describe('gridDragTo — move', () => {
  it('shifts by the SNAPPED DELTA and keeps the event’s own offset', () => {
    // Pointer moved 22 minutes → snaps to 15; 09:10 → 09:25.
    const next = gridDragTo(move(), { column: 2, minute: 592 }, RULES);
    expect(next.current).toEqual({ column: 2, start: 565, end: 625 });
    expect(next.moved).toBe(true);
    expect(endGridDrag(next)).toEqual({ column: 2, start: 565, end: 625 });
  });

  it('follows the pointer’s column and respects lockColumn', () => {
    expect(gridDragTo(move(), { column: 5, minute: 570 }, RULES).current.column).toBe(5);
    expect(gridDragTo(move(), { column: 5, minute: 570 }, { ...RULES, lockColumn: true }).current.column).toBe(2);
    expect(gridDragTo(move(), { column: 99, minute: 570 }, RULES).current.column).toBe(6);
  });

  it('keeps the length when pushed against either end of the range', () => {
    const top = gridDragTo(move(WORK), { column: 2, minute: 100 }, WORK);
    expect(top.current).toEqual({ column: 2, start: 480, end: 540 });
    const bottom = gridDragTo(move(WORK), { column: 2, minute: 1400 }, WORK);
    expect(bottom.current).toEqual({ column: 2, start: 1140, end: 1200 });
  });

  it('a jitter under half a snap is not a move; returning to the origin still counts as moved', () => {
    const start = move();
    const still = gridDragTo(start, { column: 2, minute: 576 }, RULES);
    expect(still.moved).toBe(false);
    expect(still).toBe(start); // the same object back — nothing to re-render
    const away = gridDragTo(move(), { column: 2, minute: 600 }, RULES);
    const back = gridDragTo(away, { column: 2, minute: 570 }, RULES);
    expect(back.moved).toBe(true);
    expect(endGridDrag(back)).toBeNull(); // …but commits nothing, since it is at the origin
  });

  it('does not mutate the previous state', () => {
    const state = move();
    const before = JSON.stringify(state);
    gridDragTo(state, { column: 3, minute: 700 }, RULES);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('gridDragTo — resize', () => {
  const resizeEnd = beginGridDrag({
    kind: 'resize-end',
    id: 'e',
    span: { column: 1, start: 540, end: 600 },
    at: { column: 1, minute: 600 },
    rules: RULES,
  });
  const resizeStart = beginGridDrag({
    kind: 'resize-start',
    id: 'e',
    span: { column: 1, start: 540, end: 600 },
    at: { column: 1, minute: 540 },
    rules: RULES,
  });

  it('moves the dragged end to the snapped pointer, never below minDuration', () => {
    expect(gridDragTo(resizeEnd, { column: 1, minute: 652 }, RULES).current).toEqual({
      column: 1,
      start: 540,
      end: 645,
    });
    expect(gridDragTo(resizeEnd, { column: 1, minute: 653 }, RULES).current).toEqual({
      column: 1,
      start: 540,
      end: 660,
    });
    expect(gridDragTo(resizeEnd, { column: 1, minute: 500 }, RULES).current).toEqual({
      column: 1,
      start: 540,
      end: 555,
    });
    expect(gridDragTo(resizeStart, { column: 1, minute: 500 }, RULES).current).toEqual({
      column: 1,
      start: 495,
      end: 600,
    });
    expect(gridDragTo(resizeStart, { column: 1, minute: 700 }, RULES).current).toEqual({
      column: 1,
      start: 585,
      end: 600,
    });
  });

  it('never changes the column and clamps to the range', () => {
    expect(gridDragTo(resizeEnd, { column: 4, minute: 652 }, RULES).current.column).toBe(1);
    expect(gridDragTo(resizeEnd, { column: 1, minute: 2000 }, RULES).current.end).toBe(1440);
    expect(gridDragTo(resizeStart, { column: 1, minute: -50 }, RULES).current.start).toBe(0);
  });

  it('a 30-minute minimum holds against a 60-minute event', () => {
    const rules = { ...RULES, minDuration: 30 };
    expect(gridDragTo(resizeEnd, { column: 1, minute: 545 }, rules).current.end).toBe(570);
    expect(gridDragTo(resizeStart, { column: 1, minute: 599 }, rules).current.start).toBe(570);
  });
});

describe('gridDragTo — create', () => {
  const create = beginGridDrag({
    kind: 'create',
    id: null,
    span: { column: 3, start: 0, end: 0 },
    at: { column: 3, minute: 607 },
    rules: RULES,
  });

  it('grows downward from the floored anchor to the ceiled pointer', () => {
    expect(gridDragTo(create, { column: 3, minute: 620 }, RULES).current).toEqual({ column: 3, start: 600, end: 630 });
    expect(gridDragTo(create, { column: 3, minute: 700 }, RULES).current).toEqual({ column: 3, start: 600, end: 705 });
  });

  it('grows UPWARD when the pointer goes above the anchor, keeping the pressed slot', () => {
    expect(gridDragTo(create, { column: 3, minute: 560 }, RULES).current).toEqual({ column: 3, start: 555, end: 615 });
  });

  it('is at least one snap — and at least minDuration — even with no travel', () => {
    expect(gridDragTo(create, { column: 3, minute: 607 }, RULES).current).toEqual({ column: 3, start: 600, end: 615 });
    const thirty = { ...RULES, minDuration: 30 };
    expect(gridDragTo(create, { column: 3, minute: 607 }, thirty).current).toEqual({ column: 3, start: 600, end: 630 });
    expect(gridDragTo(create, { column: 3, minute: 590 }, thirty).current).toEqual({ column: 3, start: 585, end: 615 });
  });

  it('never leaves the anchor column and clamps to the range', () => {
    expect(gridDragTo(create, { column: 6, minute: 620 }, RULES).current.column).toBe(3);
    const late = beginGridDrag({
      kind: 'create',
      id: null,
      span: { column: 0, start: 0, end: 0 },
      at: { column: 0, minute: 1435 },
      rules: RULES,
    });
    expect(gridDragTo(late, { column: 0, minute: 1500 }, RULES).current).toEqual({ column: 0, start: 1425, end: 1440 });
  });

  it('commits once it has any length', () => {
    expect(endGridDrag(create)).toBeNull();
    expect(endGridDrag(gridDragTo(create, { column: 3, minute: 610 }, RULES))).toEqual({
      column: 3,
      start: 600,
      end: 615,
    });
  });
});

describe('gridKeyStep', () => {
  it('moves by a snap, four with Shift, and changes column with Left/Right', () => {
    const grabbed = move();
    expect(gridKeyStep(grabbed, { key: 'ArrowDown' }, RULES)?.current).toEqual({ column: 2, start: 565, end: 625 });
    expect(gridKeyStep(grabbed, { key: 'ArrowUp' }, RULES)?.current).toEqual({ column: 2, start: 535, end: 595 });
    expect(gridKeyStep(grabbed, { key: 'ArrowDown', shiftKey: true }, RULES)?.current).toEqual({
      column: 2,
      start: 610,
      end: 670,
    });
    expect(gridKeyStep(grabbed, { key: 'ArrowRight' }, RULES)?.current.column).toBe(3);
    expect(gridKeyStep(grabbed, { key: 'ArrowLeft' }, RULES)?.current.column).toBe(1);
    expect(gridKeyStep(grabbed, { key: 'ArrowDown' }, RULES)?.moved).toBe(true);
  });

  it('resizes the end with Alt, respecting minDuration and the range', () => {
    const grabbed = move();
    expect(gridKeyStep(grabbed, { key: 'ArrowDown', altKey: true }, RULES)?.current).toEqual({
      column: 2,
      start: 550,
      end: 625,
    });
    let shrunk = grabbed;
    for (let i = 0; i < 10; i += 1) shrunk = gridKeyStep(shrunk, { key: 'ArrowUp', altKey: true }, RULES) ?? shrunk;
    expect(shrunk.current).toEqual({ column: 2, start: 550, end: 565 });
  });

  it('clamps at the grid edges and under lockColumn', () => {
    const grabbed = move();
    let left = grabbed;
    for (let i = 0; i < 5; i += 1) left = gridKeyStep(left, { key: 'ArrowLeft' }, RULES) ?? left;
    expect(left.current.column).toBe(0);
    expect(gridKeyStep(grabbed, { key: 'ArrowRight' }, { ...RULES, lockColumn: true })?.current.column).toBe(2);
    let up = move(WORK);
    for (let i = 0; i < 20; i += 1) up = gridKeyStep(up, { key: 'ArrowUp', shiftKey: true }, WORK) ?? up;
    expect(up.current).toEqual({ column: 2, start: 480, end: 540 });
  });

  it('a resize session’s plain arrows drive its own end', () => {
    const resizeEnd = beginGridDrag({
      kind: 'resize-end',
      id: 'e',
      span: { column: 1, start: 540, end: 600 },
      at: { column: 1, minute: 600 },
      rules: RULES,
    });
    expect(gridKeyStep(resizeEnd, { key: 'ArrowDown' }, RULES)?.current).toEqual({ column: 1, start: 540, end: 615 });
    expect(gridKeyStep(resizeEnd, { key: 'ArrowRight' }, RULES)?.current.column).toBe(1);
    const resizeStart = beginGridDrag({
      kind: 'resize-start',
      id: 'e',
      span: { column: 1, start: 540, end: 600 },
      at: { column: 1, minute: 540 },
      rules: RULES,
    });
    expect(gridKeyStep(resizeStart, { key: 'ArrowUp' }, RULES)?.current).toEqual({ column: 1, start: 525, end: 600 });
  });

  it('returns null for keys it does not own', () => {
    expect(gridKeyStep(move(), { key: 'Tab' }, RULES)).toBeNull();
    expect(gridKeyStep(move(), { key: 'a' }, RULES)).toBeNull();
    expect(gridKeyStep(move(), { key: 'Enter' }, RULES)).toBeNull();
  });
});
