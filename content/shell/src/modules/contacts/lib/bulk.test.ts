import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType, SalesStageV2 } from '~api/generated/contacts/graphql';
import type { AttributeEntry, ContactRow } from '../types';
import {
  MAX_BULK,
  bulkToast,
  currentAssignee,
  describeAction,
  emptyReport,
  fieldValue,
  hasErrors,
  inverseAction,
  isNoop,
  normalizePhone,
  optimisticAttribute,
  optimisticPatch,
  planBulk,
  planCaveat,
  planSummary,
  progressLabel,
  progressPercent,
  sameAssignee,
  startProgress,
  undoCaveat,
  undoLabel,
  undoSteps,
  validateNewContact,
  type BulkReport,
} from './bulk';

const stringAttr = (name: string, value: string): AttributeEntry => ({
  id: `a-${name}`,
  attr: { name, dataType: AttributeDataType.String, type: AttributeType.Custom, aliases: [] },
  value: { __typename: 'BotAttributeValueString', id: `v-${name}`, stringValue: value },
});

function row(over: Partial<ContactRow> = {}): ContactRow {
  return {
    __typename: 'WhatsappContact',
    phone: '+4915112345678',
    id: 'c1',
    name: 'Anna Koch',
    profilePictureUrl: null,
    updatedAt: '2026-08-18T10:00:00.000Z',
    note: null,
    salesStageV2: null,
    lastSalesStageUpdateTime: null,
    lastConversationMessageTime: null,
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    assignee: null,
    conversation: null,
    attributes: [],
    ...over,
  } as ContactRow;
}

const restricted = (id: string): ContactRow =>
  ({
    __typename: 'UnavailableContact',
    id,
    name: '',
    profilePictureUrl: null,
    updatedAt: '2026-08-18T10:00:00.000Z',
    note: null,
    salesStageV2: null,
    lastSalesStageUpdateTime: null,
    lastConversationMessageTime: null,
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    assignee: null,
    conversation: null,
    attributes: [],
  }) as ContactRow;

const AI_ROW = row({ id: 'ai', assignee: { __typename: 'FuelyAIAssignee', fakeField: null } });
const USER_ROW = row({
  id: 'u',
  assignee: {
    __typename: 'PublicUserAccount',
    id: 'user-mira',
    name: 'Mira Lang',
    isUnknown: false,
    profilePicture: null,
  },
});

describe('reading a row', () => {
  it('reports the assignee in the same vocabulary an action uses', () => {
    expect(currentAssignee(row())).toEqual({ kind: 'none' });
    expect(currentAssignee(AI_ROW)).toEqual({ kind: 'ai' });
    expect(currentAssignee(USER_ROW)).toEqual({ kind: 'user', userAccountId: 'user-mira', name: 'Mira Lang' });
  });

  it('compares users by id, not by name — a rename must not look like a change', () => {
    expect(
      sameAssignee(
        { kind: 'user', userAccountId: 'u1', name: 'Old' },
        { kind: 'user', userAccountId: 'u1', name: 'New' },
      ),
    ).toBe(true);
    expect(sameAssignee({ kind: 'ai' }, { kind: 'none' })).toBe(false);
  });

  it('reads every value branch as the string an editor would show', () => {
    expect(fieldValue(row({ attributes: [stringAttr('city', 'Berlin')] }), 'city')).toBe('Berlin');
    expect(fieldValue(row(), 'city')).toBe('');
  });
});

describe('isNoop', () => {
  it('is true when the request would change nothing', () => {
    expect(isNoop({ kind: 'stage', stage: SalesStageV2.Won }, row({ salesStageV2: SalesStageV2.Won }))).toBe(true);
    expect(isNoop({ kind: 'stage', stage: SalesStageV2.Won }, row())).toBe(false);
    expect(isNoop({ kind: 'assign', to: { kind: 'ai' } }, AI_ROW)).toBe(true);
    expect(isNoop({ kind: 'assign', to: { kind: 'none' } }, row())).toBe(true);
    expect(isNoop({ kind: 'note', note: '' }, row())).toBe(true);
    expect(isNoop({ kind: 'rename', name: 'Anna Koch' }, row())).toBe(true);
  });

  it('treats clearing an absent field as a no-op — a delete of nothing is still a request', () => {
    expect(isNoop({ kind: 'clearField', name: 'city' }, row())).toBe(true);
    expect(isNoop({ kind: 'clearField', name: 'city' }, row({ attributes: [stringAttr('city', 'Berlin')] }))).toBe(
      false,
    );
  });

  it('compares a field against the WIRE value, not the raw input', () => {
    const withCity = row({ attributes: [stringAttr('city', 'Berlin')] });
    expect(isNoop({ kind: 'setField', name: 'city', value: '  Berlin  ' }, withCity)).toBe(true);
  });
});

describe('planBulk', () => {
  const rows = [row({ id: 'a' }), row({ id: 'b', salesStageV2: SalesStageV2.Won }), restricted('r'), row({ id: 'c' })];

  it('drops restricted contacts before anything else — every mutation against one fails', () => {
    const plan = planBulk({ kind: 'stage', stage: SalesStageV2.Won }, rows);
    expect(plan.targets.map((each) => each.id)).toEqual(['a', 'c']);
    expect(plan.skipped.map((each) => each.id)).toEqual(['b']);
  });

  it('caps the run and says how many it left out', () => {
    const many = Array.from({ length: 12 }, (_, index) => row({ id: `c${index}` }));
    const plan = planBulk({ kind: 'stage', stage: SalesStageV2.Won }, many, 5);
    expect(plan.targets).toHaveLength(5);
    expect(plan.dropped).toBe(7);
    expect(plan.capped).toBe(true);
  });

  it('is not capped when it fits exactly', () => {
    const five = Array.from({ length: 5 }, (_, index) => row({ id: `c${index}` }));
    expect(planBulk({ kind: 'stage', stage: SalesStageV2.Won }, five, 5).capped).toBe(false);
  });

  it('defaults to the API-derived cap', () => {
    expect(MAX_BULK).toBe(500);
  });
});

describe('what the confirm dialog says', () => {
  it('names the action and the count', () => {
    const plan = planBulk({ kind: 'stage', stage: SalesStageV2.Won }, [row({ id: 'a' }), row({ id: 'b' })]);
    expect(planSummary(plan)).toBe('Move to Won on 2 contacts.');
  });

  it('says nothing to do when every row already matches', () => {
    const plan = planBulk({ kind: 'stage', stage: SalesStageV2.Won }, [row({ salesStageV2: SalesStageV2.Won })]);
    expect(planSummary(plan)).toContain('Nothing to do');
  });

  it('emits the sequential-requests caveat only for a run of more than one', () => {
    const one = planBulk({ kind: 'stage', stage: SalesStageV2.Won }, [row()]);
    expect(planCaveat(one)).toBeNull();
    const two = planBulk({ kind: 'stage', stage: SalesStageV2.Won }, [row({ id: 'a' }), row({ id: 'b' })]);
    expect(planCaveat(two)).toContain('2 separate requests');
  });

  it('mentions the cap and the skips only when they happened', () => {
    const many = Array.from({ length: 9 }, (_, index) => row({ id: `c${index}` }));
    const capped = planBulk(
      { kind: 'stage', stage: SalesStageV2.Won },
      [...many, row({ id: 'done', salesStageV2: SalesStageV2.Won })],
      4,
    );
    const caveat = planCaveat(capped) ?? '';
    expect(caveat).toContain('5 contacts beyond');
    expect(caveat).toContain('1 contact already match');
  });

  it('describes unassigning as unassigning, not as assigning to nobody', () => {
    expect(describeAction({ kind: 'assign', to: { kind: 'none' } })).toBe('Unassign');
    expect(describeAction({ kind: 'assign', to: { kind: 'ai' } })).toBe('Assign to Fuely AI');
  });
});

describe('optimism', () => {
  it('writes the exact value for every branch it can fill honestly', () => {
    expect(optimisticPatch({ kind: 'stage', stage: SalesStageV2.Won }, row())).toEqual({
      salesStageV2: SalesStageV2.Won,
    });
    expect(optimisticPatch({ kind: 'note', note: '' }, row({ note: 'x' }))).toEqual({ note: null });
    expect(optimisticPatch({ kind: 'assign', to: { kind: 'none' } }, USER_ROW)).toEqual({ assignee: null });
  });

  it('refuses to invent a number for a typed attribute', () => {
    expect(optimisticAttribute('score', AttributeDataType.Long, 'abc')).toBeNull();
    expect(optimisticAttribute('score', AttributeDataType.Long, '42')?.value).toEqual({
      __typename: 'BotAttributeValueLong',
      id: 'optimistic:score',
      longValue: 42,
    });
    expect(optimisticAttribute('ok', AttributeDataType.Boolean, 'maybe')).toBeNull();
  });

  it('creates an unknown attribute as custom/string, which is what the API does', () => {
    const entry = optimisticAttribute('brand new', undefined, 'yes');
    expect(entry?.attr.type).toBe(AttributeType.Custom);
    expect(entry?.attr.dataType).toBe(AttributeDataType.String);
  });

  it('replaces one attribute and leaves the rest of the row alone', () => {
    const current = row({ attributes: [stringAttr('city', 'Berlin'), stringAttr('company', 'Acme')] });
    const patch = optimisticPatch(
      { kind: 'setField', name: 'city', value: 'Lisbon' },
      current,
      () => AttributeDataType.String,
    );
    const names = (patch?.attributes ?? []).map((entry) => entry.attr.name).sort();
    expect(names).toEqual(['city', 'company']);
    expect(fieldValue({ attributes: patch?.attributes ?? [] }, 'city')).toBe('Lisbon');
  });

  it('removes the attribute entirely when it is cleared', () => {
    const current = row({ attributes: [stringAttr('city', 'Berlin')] });
    expect(optimisticPatch({ kind: 'clearField', name: 'city' }, current)?.attributes).toEqual([]);
  });
});

describe('inverseAction', () => {
  it('cannot put a contact back to "no stage" — the mutation has no such value', () => {
    expect(inverseAction({ kind: 'stage', stage: SalesStageV2.Won }, row())).toBeNull();
    expect(inverseAction({ kind: 'stage', stage: SalesStageV2.Won }, row({ salesStageV2: SalesStageV2.New }))).toEqual({
      kind: 'stage',
      stage: SalesStageV2.New,
    });
  });

  it('turns a set into a clear when the field was empty, and back again', () => {
    expect(inverseAction({ kind: 'setField', name: 'city', value: 'Lisbon' }, row())).toEqual({
      kind: 'clearField',
      name: 'city',
    });
    expect(
      inverseAction({ kind: 'clearField', name: 'city' }, row({ attributes: [stringAttr('city', 'Berlin')] })),
    ).toEqual({ kind: 'setField', name: 'city', value: 'Berlin' });
  });

  it('restores the previous owner, including "nobody"', () => {
    expect(inverseAction({ kind: 'assign', to: { kind: 'ai' } }, row())).toEqual({
      kind: 'assign',
      to: { kind: 'none' },
    });
    expect(inverseAction({ kind: 'assign', to: { kind: 'none' } }, USER_ROW)).toEqual({
      kind: 'assign',
      to: { kind: 'user', userAccountId: 'user-mira', name: 'Mira Lang' },
    });
  });
});

describe('progress', () => {
  it('starts empty and running', () => {
    const progress = startProgress(10);
    expect(progress).toMatchObject({ total: 10, done: 0, running: true, stopping: false });
    expect(progressPercent(progress)).toBe(0);
  });

  it('never divides by zero', () => {
    expect(progressPercent(startProgress(0))).toBe(0);
  });

  it('mentions failures only once there are some', () => {
    const clean = { ...startProgress(4), done: 2 };
    expect(progressLabel(clean)).toBe('2 of 4');
    expect(progressLabel({ ...clean, failures: [{ id: 'a', name: 'A', message: 'no' }] })).toBe('2 of 4 · 1 failed');
  });
});

function reportWith(over: Partial<BulkReport>): BulkReport {
  return { ...emptyReport({ kind: 'stage', stage: SalesStageV2.Won }), ...over };
}

describe('the one toast a run produces', () => {
  it('is a success when everything landed', () => {
    const toast = bulkToast(reportWith({ succeeded: [{ id: 'a', name: 'Anna', inverse: null }] }));
    expect(toast.tone).toBe('success');
    expect(toast.title).toBe('Move to Won — 1 contact');
    expect(toast.description).toBeUndefined();
  });

  it('names at most three failures and counts the rest', () => {
    const failures = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: name, name, message: 'boom' }));
    const toast = bulkToast(reportWith({ succeeded: [{ id: 'z', name: 'Z', inverse: null }], failures }));
    expect(toast.tone).toBe('warning');
    expect(toast.description).toContain('A, B, C and 2 more');
    expect(toast.description).toContain('boom');
  });

  it('is a failure when nothing landed at all', () => {
    const toast = bulkToast(reportWith({ failures: [{ id: 'a', name: 'A', message: 'boom' }] }));
    expect(toast.tone).toBe('danger');
    expect(toast.title).toBe('Could not move to won');
  });

  it('mentions skipped and dropped rows only when there were any', () => {
    const clean = bulkToast(reportWith({ succeeded: [{ id: 'a', name: 'A', inverse: null }] }));
    expect(clean.description).toBeUndefined();
    const noisy = bulkToast(
      reportWith({ succeeded: [{ id: 'a', name: 'A', inverse: null }], skipped: 2, dropped: 3, stopped: true }),
    );
    expect(noisy.description).toContain('Stopped part-way');
    expect(noisy.description).toContain('2 contacts already matched');
    expect(noisy.description).toContain('3 contacts beyond');
  });
});

describe('undo', () => {
  const undoable = { id: 'a', name: 'A', inverse: { kind: 'stage' as const, stage: SalesStageV2.New } };
  const stuck = { id: 'b', name: 'B', inverse: null };

  it('offers nothing when no row can be put back', () => {
    const report = reportWith({ succeeded: [stuck] });
    expect(undoSteps(report)).toEqual([]);
    expect(undoLabel(report)).toBeNull();
    expect(undoCaveat(report)).toBeNull();
  });

  it('drops the rows it cannot reverse rather than silently skipping them later', () => {
    const report = reportWith({ succeeded: [undoable, stuck] });
    expect(undoSteps(report)).toEqual([{ id: 'a', action: { kind: 'stage', stage: SalesStageV2.New } }]);
    expect(undoLabel(report)).toBe('Undo 1 contact of 2');
    expect(undoCaveat(report)).toContain('1 contact had no stage before');
  });

  it('says the update time is re-stamped, because undo is a forward write', () => {
    const report = reportWith({ succeeded: [undoable] });
    expect(undoLabel(report)).toBe('Undo (1 contact)');
    expect(undoCaveat(report)).toContain('re-stamped');
  });
});

describe('creating a contact', () => {
  it('requires a phone, because it is what identifies a WhatsApp contact', () => {
    const errors = validateNewContact({ phone: '  ', name: '', note: '' });
    expect(errors.phone).toContain('required');
    expect(hasErrors(errors)).toBe(true);
  });

  it('accepts the international form and rejects anything else', () => {
    expect(validateNewContact({ phone: '+4915112345678', name: '', note: '' }).phone).toBeNull();
    expect(validateNewContact({ phone: '+49 151 (123) 456-78', name: '', note: '' }).phone).toBeNull();
    expect(validateNewContact({ phone: '0151abc', name: '', note: '' }).phone).toContain('international form');
    expect(validateNewContact({ phone: '+1234567890123456789', name: '', note: '' }).phone).not.toBeNull();
  });

  it('holds the API limits the mutation documents', () => {
    expect(validateNewContact({ phone: '+49123456', name: 'x'.repeat(300), note: '' }).name).not.toBeNull();
    expect(validateNewContact({ phone: '+49123456', name: '', note: 'x'.repeat(3000) }).note).not.toBeNull();
  });

  it('normalises the phone to the form the mutation wants', () => {
    expect(normalizePhone(' 49 151-123 ')).toBe('+49151123');
    expect(normalizePhone('+49151123')).toBe('+49151123');
  });
});
