import { describe, expect, it } from 'vitest';
import type { MessageNode } from '../types';
import type { ThreadEntry } from './threadStore';
import { buildThread, unreadAnchorRowId, type MessageRow, type RunRow } from './threadRows';

const T0 = Date.parse('2026-08-18T12:00:00Z');
const at = (msAfter: number) => new Date(T0 + msAfter).toISOString();

const entry = (over: Record<string, unknown>): ThreadEntry => ({
  node: {
    __typename: 'CoworkerMessage',
    id: 'm',
    clientID: null,
    role: 'coworker',
    content: 'text',
    clientActionType: null,
    time: at(0),
    attachments: [],
    toolCalls: [],
    ...over,
  } as unknown as MessageNode,
});

const said = (id: string, role: 'user' | 'coworker', content: string, msAfter: number) =>
  entry({ id, role, content, time: at(msAfter) });

const tool = (id: string, toolID: string, msAfter: number) =>
  entry({
    id,
    content: '',
    time: at(msAfter),
    toolCalls: [{ __typename: 'CoworkerToolOther', toolID }],
  });

const action = (id: string, actionType: string, parameters: Record<string, unknown>, msAfter: number) =>
  entry({
    id,
    content: '',
    time: at(msAfter),
    toolCalls: [{ __typename: 'CoworkerFrontendAction', actionType, parameters }],
  });

const kinds = (rows: readonly { kind: string }[]) => rows.map((row) => row.kind);

describe('buildThread', () => {
  it('collapses consecutive steps into one run and keeps the messages around it', () => {
    const { rows } = buildThread([
      said('m1', 'user', 'How is my pipeline doing?', 0),
      tool('m2', 'skill-analytics_instr', 1_000),
      tool('m3', 'chatfuel_gql-list_contacts', 2_000),
      tool('m4', 'chatfuel_gql-list_deals', 3_000),
      action('m5', 'navigate', { pathKey: 'Deals' }, 4_000),
      said('m6', 'coworker', 'Opened your **Deals** board.', 5_000),
    ]);
    expect(kinds(rows)).toEqual(['message', 'run', 'message']);
    const run = rows[1] as RunRow;
    expect(run.id).toBe('run:m2');
    expect(run.steps.map((step) => step.messageId)).toEqual(['m2', 'm3', 'm4', 'm5']);
    expect(run.at).toBe(T0 + 1_000);
  });

  it('starts a second run when a message interrupts the first', () => {
    const { rows } = buildThread([
      tool('m1', 'a', 0),
      said('m2', 'coworker', 'One moment.', 1_000),
      tool('m3', 'b', 2_000),
    ]);
    expect(kinds(rows)).toEqual(['run', 'message', 'run']);
    expect((rows[2] as RunRow).id).toBe('run:m3');
  });

  it('lifts the trailing quick-reply offer out of the rows, in the order it was made', () => {
    const { rows, quickReplies } = buildThread([
      said('m1', 'coworker', 'Want me to nudge the stuck ones?', 0),
      action('m2', 'suggest_quick_reply', { text: 'Nudge the stuck deals' }, 1_000),
      action('m3', 'suggest_quick_reply', { text: 'Show me the 3 unassigned' }, 2_000),
      action('m4', 'suggest_quick_reply', { text: 'Leave them for now' }, 3_000),
    ]);
    expect(quickReplies).toEqual(['Nudge the stuck deals', 'Show me the 3 unassigned', 'Leave them for now']);
    expect(kinds(rows)).toEqual(['message']);
  });

  it('leaves a spent offer in the history instead of re-offering it', () => {
    const { rows, quickReplies } = buildThread([
      action('m1', 'suggest_quick_reply', { text: 'Nudge them' }, 0),
      said('m2', 'user', 'Nudge them', 1_000),
      said('m3', 'coworker', 'Done.', 2_000),
    ]);
    expect(quickReplies).toEqual([]);
    expect(kinds(rows)).toEqual(['run', 'message', 'message']);
    expect((rows[0] as RunRow).steps).toHaveLength(1);
  });

  it('groups the same author inside the window and breaks on author, gap and run', () => {
    const { rows } = buildThread([
      said('m1', 'coworker', 'First.', 0),
      said('m2', 'coworker', 'Second, right after.', 30_000),
      said('m3', 'user', 'My turn.', 40_000),
      said('m4', 'coworker', 'Answer.', 50_000),
      tool('m5', 'chatfuel_gql-list_deals', 60_000),
      said('m6', 'coworker', 'And the result.', 70_000),
      said('m7', 'coworker', 'Much later.', 70_000 + 4 * 60_000),
    ]);
    const grouped = rows.filter((row): row is MessageRow => row.kind === 'message').map((row) => row.grouped);
    expect(grouped).toEqual([false, true, false, false, false, false]);
  });

  it('inherits the previous time for an unparseable one rather than throwing later', () => {
    const { rows } = buildThread([
      said('m1', 'user', 'hello', 0),
      entry({ id: 'm2', role: 'coworker', content: 'hi', time: 'not a time' }),
    ]);
    expect(rows.map((row) => row.at)).toEqual([T0, T0]);
  });

  it('keeps the entry key as the row id so an optimistic send does not jump', () => {
    const { rows } = buildThread([entry({ id: 'local-c1', clientID: 'c1', role: 'user', content: 'sending' })]);
    expect(rows[0]!.id).toBe('c1');
  });
});

describe('unreadAnchorRowId', () => {
  const thread = buildThread([
    said('m1', 'user', 'question', 0),
    tool('m2', 'chatfuel_gql-list_deals', 1_000),
    said('m3', 'coworker', 'answer', 2_000),
    said('m4', 'coworker', 'and more', 3_000),
  ]);

  it('anchors on the row after the read cursor', () => {
    expect(unreadAnchorRowId(thread.rows, 'm3')).toBe('m4');
  });

  it('resolves a cursor that was folded into a run', () => {
    expect(unreadAnchorRowId(thread.rows, 'm2')).toBe('m3');
  });

  it('is null for a cursor that is read to the end, unknown, or absent', () => {
    expect(unreadAnchorRowId(thread.rows, 'm4')).toBeNull();
    expect(unreadAnchorRowId(thread.rows, 'invisible-tool-result')).toBeNull();
    expect(unreadAnchorRowId(thread.rows, null)).toBeNull();
  });
});
