/**
 * Bulk actions, planned as data.
 *
 * **There is no bulk mutation in this API.** Not for the stage, not for the
 * assignee, not for an attribute — `contactSetSalesStage`, `contactSetAssignee`
 * and `contactAttributeUpdate` each take exactly one `ContactID`. So "set the
 * stage on 120 contacts" is 120 requests, and every consequence of that has to
 * be owned rather than hidden:
 *
 * - **A cap.** `MAX_BULK` is the number of requests one action may fire. Past
 *   it the confirm dialog says how many of the match are being left out; it
 *   never silently covers a prefix.
 * - **A partial result is the normal case.** A run can be stopped halfway and
 *   individual rows can fail, so the outcome is a report — what landed, what
 *   did not, and whose name to print — not a boolean.
 * - **Undo is a compensating forward mutation.** There is no history in this
 *   API, so undo means writing the old value back, one request per row, and
 *   `updatedAt` is re-stamped by it. Some rows cannot be undone at all (a
 *   contact that had NO stage cannot be returned to none — `salesStageV2` is
 *   non-null on the mutation), and `undoSteps` drops exactly those rather than
 *   offering an Undo that quietly skips them.
 *
 * Everything here is pure. `hooks/useBulkRun.ts` is the only thing that
 * touches the network, and it takes its whole decision from this file.
 */
import { AttributeDataType, AttributeType, type SalesStageV2 } from '~api/generated/contacts/graphql';
import type { AttributeEntry, ContactRow } from '../types';
import { inputToAttrValue } from './attributeValue';
import { STAGE_META, attributeEntry, contactName } from './tableColumns';

/**
 * How many contacts one run may touch.
 *
 * Chosen against the API rather than picked: the list's own page cap is 500
 * (`first: 500` works, `first: 1000` fails), so 500 is the most rows the list
 * can be holding when the user asks, and it is already the number the
 * select-all confirm has to explain.
 */
export const MAX_BULK = 500;

export type BulkAssignee = { kind: 'user'; userAccountId: string; name: string } | { kind: 'ai' } | { kind: 'none' };

/** Every single-row write the list can make. The bulk bar uses a subset. */
export type RowAction =
  | { kind: 'stage'; stage: SalesStageV2 }
  | { kind: 'assign'; to: BulkAssignee }
  | { kind: 'setField'; name: string; value: string }
  | { kind: 'clearField'; name: string }
  | { kind: 'rename'; name: string }
  | { kind: 'note'; note: string };

/** The actions a selection can be run through. Rename and note are per-row only. */
export type BulkAction = Extract<RowAction, { kind: 'stage' | 'assign' | 'setField' | 'clearField' }>;

// ---------------------------------------------------------------------------
// Reading a row against an action
// ---------------------------------------------------------------------------

/** The assignee a row currently has, in the same vocabulary the action uses. */
export function currentAssignee(row: Pick<ContactRow, 'assignee'>): BulkAssignee {
  const assignee = row.assignee;
  if (!assignee) return { kind: 'none' };
  if (assignee.__typename === 'FuelyAIAssignee') return { kind: 'ai' };
  return { kind: 'user', userAccountId: assignee.id, name: assignee.name };
}

export function sameAssignee(a: BulkAssignee, b: BulkAssignee): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'user' || a.userAccountId === (b as { userAccountId: string }).userAccountId;
}

/** The stored value of one attribute, as the string an editor would show. */
export function fieldValue(row: Pick<ContactRow, 'attributes'>, name: string): string {
  const entry = attributeEntry(row, name);
  if (!entry) return '';
  const value = entry.value;
  switch (value.__typename) {
    case 'BotAttributeValueString':
      return value.stringValue;
    case 'BotAttributeValueLong':
      return String(value.longValue);
    case 'BotAttributeValueDouble':
      return String(value.doubleValue);
    case 'BotAttributeValueBoolean':
      return value.booleanValue ? 'true' : 'false';
    case 'BotAttributeValueDatetime':
      return value.datetimeValue;
    default:
      return '';
  }
}

/**
 * True when the request would change nothing.
 *
 * A no-op still costs a round trip and still re-stamps `updatedAt`, which is
 * this module's only clock — a real edit to the contact's age with nothing to
 * show for it. Deals learned the same lesson on `lastSalesStageUpdateTime`.
 */
export function isNoop(action: RowAction, row: ContactRow): boolean {
  switch (action.kind) {
    case 'stage':
      return row.salesStageV2 === action.stage;
    case 'assign':
      return sameAssignee(currentAssignee(row), action.to);
    case 'setField':
      return fieldValue(row, action.name) === inputToAttrValue(undefined, action.value);
    case 'clearField':
      return attributeEntry(row, action.name) === undefined;
    case 'rename':
      return row.name === action.name;
    case 'note':
      return (row.note ?? '') === action.note;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Planning a run
// ---------------------------------------------------------------------------

export interface BulkPlan {
  action: BulkAction;
  /** Rows the run will actually send a request for, in list order. */
  targets: ContactRow[];
  /** Rows already in the requested state. */
  skipped: ContactRow[];
  /** Rows past the cap. Named so the dialog can say the number out loud. */
  dropped: number;
  capped: boolean;
}

/**
 * What a run would do, before it does any of it.
 *
 * Restricted contacts are excluded first: every field on an `UnavailableContact`
 * is empty and every mutation against one fails, so including them would turn a
 * clean run into a list of failures the user cannot act on.
 */
export function planBulk(action: BulkAction, rows: readonly ContactRow[], cap = MAX_BULK): BulkPlan {
  const actionable = rows.filter((row) => row.__typename !== 'UnavailableContact');
  const skipped = actionable.filter((row) => isNoop(action, row));
  const changing = actionable.filter((row) => !isNoop(action, row));
  return {
    action,
    targets: changing.slice(0, cap),
    skipped,
    dropped: Math.max(0, changing.length - cap),
    capped: changing.length > cap,
  };
}

const quoted = (name: string): string => `“${name}”`;

const assigneeLabelOf = (to: BulkAssignee): string =>
  to.kind === 'ai' ? 'Fuely AI' : to.kind === 'none' ? 'nobody' : to.name;

/** What a menu entry or a confirm dialog calls the action. */
export function describeAction(action: RowAction): string {
  switch (action.kind) {
    case 'stage':
      return `Move to ${STAGE_META[action.stage]?.label ?? action.stage}`;
    case 'assign':
      return action.kind === 'assign' && action.to.kind === 'none'
        ? 'Unassign'
        : `Assign to ${assigneeLabelOf(action.to)}`;
    case 'setField':
      return `Set ${quoted(action.name)}`;
    case 'clearField':
      return `Clear ${quoted(action.name)}`;
    case 'rename':
      return 'Rename';
    case 'note':
      return 'Edit note';
    default:
      return 'Update';
  }
}

const plural = (n: number): string => `${n.toLocaleString()} ${n === 1 ? 'contact' : 'contacts'}`;

/** The confirm dialog's headline: exactly what is about to be requested. */
export function planSummary(plan: BulkPlan): string {
  const count = plan.targets.length;
  if (count === 0) {
    return plan.skipped.length > 0
      ? `Nothing to do — ${plural(plan.skipped.length)} already ${plan.action.kind === 'clearField' ? 'have this field empty' : 'have this value'}.`
      : 'Nothing to do — no contact in the selection can be changed.';
  }
  return `${describeAction(plan.action)} on ${plural(count)}.`;
}

/**
 * The sentence that must appear before a long run starts. Emitted only when the
 * run is actually long enough to be worth warning about, or actually capped.
 */
export function planCaveat(plan: BulkPlan): string | null {
  const parts: string[] = [];
  if (plan.targets.length > 1) {
    parts.push(
      `This API has no bulk mutation, so this is ${plan.targets.length.toLocaleString()} separate requests, sent one at a time. You can stop it part-way.`,
    );
  }
  if (plan.capped) {
    parts.push(`${plural(plan.dropped)} beyond the ${MAX_BULK.toLocaleString()}-per-run limit are not included.`);
  }
  if (plan.skipped.length > 0) {
    parts.push(`${plural(plan.skipped.length)} already match and are skipped.`);
  }
  return parts.length === 0 ? null : parts.join(' ');
}

// ---------------------------------------------------------------------------
// Optimism
// ---------------------------------------------------------------------------

/** The wire value `contactAttributeUpdate` is given for this field. */
export const wireValue = (dataType: AttributeDataType | undefined, value: string): string =>
  inputToAttrValue(dataType, value);

/**
 * An attribute entry as the server would send it back.
 *
 * Only built when the typed branch can be filled honestly: writing "abc" into a
 * `long` attribute would have to invent a number, so that case produces no
 * optimistic patch at all and the row simply waits for the answer. Showing a
 * wrong value for 300 ms is worse than showing the old one.
 */
export function optimisticAttribute(
  name: string,
  dataType: AttributeDataType | undefined,
  wire: string,
  existing?: AttributeEntry,
): AttributeEntry | null {
  const id = existing?.id ?? `optimistic:${name}`;
  const valueId = existing?.value.id ?? id;
  const attr = existing?.attr ?? {
    name,
    /* API fact: writing an unknown attribute creates it as custom/string, and
       it is filterable immediately. */
    dataType: dataType ?? AttributeDataType.String,
    type: AttributeType.Custom,
    aliases: [],
  };

  switch (dataType ?? AttributeDataType.String) {
    case AttributeDataType.Long: {
      const parsed = Number(wire);
      if (!Number.isFinite(parsed)) return null;
      return { id, attr, value: { __typename: 'BotAttributeValueLong', id: valueId, longValue: parsed } };
    }
    case AttributeDataType.Double: {
      const parsed = Number(wire);
      if (!Number.isFinite(parsed)) return null;
      return { id, attr, value: { __typename: 'BotAttributeValueDouble', id: valueId, doubleValue: parsed } };
    }
    case AttributeDataType.Boolean: {
      const lowered = wire.trim().toLowerCase();
      if (lowered !== 'true' && lowered !== 'false') return null;
      return {
        id,
        attr,
        value: { __typename: 'BotAttributeValueBoolean', id: valueId, booleanValue: lowered === 'true' },
      };
    }
    case AttributeDataType.Datetime:
      return { id, attr, value: { __typename: 'BotAttributeValueDatetime', id: valueId, datetimeValue: wire } };
    default:
      return { id, attr, value: { __typename: 'BotAttributeValueString', id: valueId, stringValue: wire } };
  }
}

/**
 * What the store writes before the request goes out.
 *
 * Null means "no honest optimistic form" — the write still happens, the cell
 * just does not pretend to know the answer. `assign` to a member is one of
 * those only when the caller has no name for the id; every other case is exact.
 */
export function optimisticPatch(
  action: RowAction,
  row: ContactRow,
  dataTypeOf: (name: string) => AttributeDataType | undefined = () => undefined,
): Partial<ContactRow> | null {
  switch (action.kind) {
    case 'stage':
      return { salesStageV2: action.stage } as Partial<ContactRow>;
    case 'rename':
      return { name: action.name } as Partial<ContactRow>;
    case 'note':
      return { note: action.note === '' ? null : action.note } as Partial<ContactRow>;
    case 'assign': {
      if (action.to.kind === 'none') return { assignee: null } as Partial<ContactRow>;
      if (action.to.kind === 'ai') {
        return { assignee: { __typename: 'FuelyAIAssignee', fakeField: null } } as Partial<ContactRow>;
      }
      return {
        assignee: {
          __typename: 'PublicUserAccount',
          id: action.to.userAccountId,
          name: action.to.name,
          isUnknown: false,
          profilePicture: null,
        },
      } as Partial<ContactRow>;
    }
    case 'clearField':
      return {
        attributes: row.attributes.filter((entry) => entry.attr.name !== action.name),
      } as Partial<ContactRow>;
    case 'setField': {
      const dataType = dataTypeOf(action.name);
      const wire = wireValue(dataType, action.value);
      const next = optimisticAttribute(action.name, dataType, wire, attributeEntry(row, action.name));
      if (next === null) return null;
      return {
        attributes: [...row.attributes.filter((entry) => entry.attr.name !== action.name), next],
      } as Partial<ContactRow>;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

/**
 * The call that puts one row back, or null when the API cannot express it.
 *
 * The one honest null: a contact that had NO stage. `contactSetSalesStage`
 * takes a non-null `SalesStageV2!`, so there is no value meaning "none" and the
 * move is simply not reversible. Same shape as the deals board, same reason.
 */
export function inverseAction(action: RowAction, row: ContactRow): RowAction | null {
  switch (action.kind) {
    case 'stage':
      return row.salesStageV2 ? { kind: 'stage', stage: row.salesStageV2 } : null;
    case 'assign':
      return { kind: 'assign', to: currentAssignee(row) };
    case 'rename':
      return { kind: 'rename', name: row.name };
    case 'note':
      return { kind: 'note', note: row.note ?? '' };
    case 'setField':
    case 'clearField': {
      const before = fieldValue(row, action.name);
      return before === ''
        ? { kind: 'clearField', name: action.name }
        : { kind: 'setField', name: action.name, value: before };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Running, and what came of it
// ---------------------------------------------------------------------------

export interface BulkFailure {
  id: string;
  /** The contact's name, so the report names a person and not an id. */
  name: string;
  message: string;
}

export interface BulkProgress {
  total: number;
  done: number;
  failures: BulkFailure[];
  /** The user asked it to stop; the loop finishes the request in flight. */
  stopping: boolean;
  running: boolean;
}

export const startProgress = (total: number): BulkProgress => ({
  total,
  done: 0,
  failures: [],
  stopping: false,
  running: true,
});

export function progressLabel(progress: BulkProgress): string {
  const base = `${progress.done.toLocaleString()} of ${progress.total.toLocaleString()}`;
  if (progress.failures.length === 0) return base;
  return `${base} · ${progress.failures.length.toLocaleString()} failed`;
}

export const progressPercent = (progress: BulkProgress): number =>
  progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

export interface BulkStep {
  id: string;
  action: RowAction;
}

export interface BulkReport {
  action: BulkAction;
  /** Rows the server accepted, with the call that would put each one back. */
  succeeded: { id: string; name: string; inverse: RowAction | null }[];
  failures: BulkFailure[];
  skipped: number;
  dropped: number;
  /** True when the user stopped the run before it reached the end. */
  stopped: boolean;
}

export const emptyReport = (action: BulkAction): BulkReport => ({
  action,
  succeeded: [],
  failures: [],
  skipped: 0,
  dropped: 0,
  stopped: false,
});

/** One toast per run, whatever happened inside it. */
export interface BulkToast {
  tone: 'success' | 'warning' | 'danger';
  title: string;
  description?: string;
}

export function bulkToast(report: BulkReport): BulkToast {
  const landed = report.succeeded.length;
  const failed = report.failures.length;
  const verb = describeAction(report.action).toLowerCase();

  const parts: string[] = [];
  if (report.stopped) parts.push('Stopped part-way.');
  if (failed > 0) {
    const names = report.failures.slice(0, 3).map((failure) => failure.name);
    const more = failed > names.length ? ` and ${(failed - names.length).toLocaleString()} more` : '';
    parts.push(`${names.join(', ')}${more} could not be updated: ${report.failures[0]?.message ?? 'unknown error'}`);
  }
  if (report.skipped > 0) parts.push(`${plural(report.skipped)} already matched and were skipped.`);
  if (report.dropped > 0)
    parts.push(`${plural(report.dropped)} beyond the ${MAX_BULK}-per-run limit were not included.`);
  const description = parts.length === 0 ? undefined : parts.join(' ');

  if (landed === 0) {
    return {
      tone: failed > 0 ? 'danger' : 'warning',
      title: failed > 0 ? `Could not ${verb}` : 'Nothing changed',
      description,
    };
  }
  return {
    tone: failed > 0 || report.stopped ? 'warning' : 'success',
    title: `${describeAction(report.action)} — ${plural(landed)}`,
    description,
  };
}

/**
 * The rows an undo can actually put back. A row whose inverse is null is
 * dropped here rather than silently skipped later.
 */
export function undoSteps(report: BulkReport): BulkStep[] {
  return report.succeeded.flatMap((entry) => (entry.inverse === null ? [] : [{ id: entry.id, action: entry.inverse }]));
}

/** Null when nothing can be put back — then no Undo is offered at all. */
export function undoLabel(report: BulkReport): string | null {
  const steps = undoSteps(report);
  if (steps.length === 0) return null;
  const missed = report.succeeded.length - steps.length;
  return missed === 0
    ? `Undo (${plural(steps.length)})`
    : `Undo ${plural(steps.length)} of ${report.succeeded.length.toLocaleString()}`;
}

/**
 * Said next to the Undo, and only when it is true: a row that had no stage
 * cannot come back, and `updatedAt` is re-stamped by the compensating write.
 */
export function undoCaveat(report: BulkReport): string | null {
  const steps = undoSteps(report);
  if (steps.length === 0) return null;
  const missed = report.succeeded.length - steps.length;
  const parts = ['Undo writes the old value back, one request per contact, so the update time is re-stamped.'];
  if (missed > 0) {
    parts.push(
      `${plural(missed)} had no stage before, and the API has no way to set “no stage” — those stay where they are.`,
    );
  }
  return parts.join(' ');
}

/** The name a failure line prints. Exported so the hook never invents one. */
export const rowLabel = (row: ContactRow): string => contactName(row);

// ---------------------------------------------------------------------------
// Creating a contact
// ---------------------------------------------------------------------------

/**
 * `whatsappContactCreateV2` is the only create in this API, and the SDL names
 * the five ways it rejects one: the phone outside the character limit, the
 * phone containing invalid characters, the phone simply invalid, the name too
 * long, the note too long.
 *
 * Checking the shape here is not a duplicate of the server's check — it is what
 * turns "WhatsappPhoneContainsInvalidCharacters" into a sentence next to the
 * field that caused it. The server stays the authority; anything it rejects
 * that this let through is still surfaced as its own message.
 */
export interface NewContactDraft {
  phone: string;
  name: string;
  note: string;
}

export interface NewContactErrors {
  phone: string | null;
  name: string | null;
  note: string | null;
}

/** The API's own limits, from the mutation's DefinedErrorCodes. */
export const MAX_CONTACT_NAME = 255;
export const MAX_CONTACT_NOTE = 2000;
const PHONE_SHAPE = /^\+?[0-9]{6,15}$/;

export function validateNewContact(draft: NewContactDraft): NewContactErrors {
  const phone = draft.phone.trim();
  const compact = phone.replace(/[\s()-]/g, '');
  return {
    phone:
      phone === ''
        ? 'A phone number is required — it is what identifies a WhatsApp contact.'
        : !PHONE_SHAPE.test(compact)
          ? 'Use the international form: a leading + and 6 to 15 digits, for example +4915112345678.'
          : null,
    name: draft.name.trim().length > MAX_CONTACT_NAME ? `Keep the name under ${MAX_CONTACT_NAME} characters.` : null,
    note: draft.note.trim().length > MAX_CONTACT_NOTE ? `Keep the note under ${MAX_CONTACT_NOTE} characters.` : null,
  };
}

export const hasErrors = (errors: NewContactErrors): boolean =>
  errors.phone !== null || errors.name !== null || errors.note !== null;

/** The phone as the mutation wants it: digits with a leading `+`. */
export function normalizePhone(phone: string): string {
  const compact = phone.trim().replace(/[\s()-]/g, '');
  return compact.startsWith('+') ? compact : `+${compact}`;
}
