import type { ModuleClient } from '~api';
import type {
  BlockPartsFragment,
  ConnectionPartsFragment,
  ElementPartsFragment,
  FlowPartsFragment,
  FlowsListQuery,
  FlowStructureQuery,
  FlowTestMessagesQuery,
  FlowTestStartMutation,
} from '~api/generated/flow-builder/graphql';

/**
 * The injected client, under the module's local name. Satisfied by the real
 * ChatfuelClient (~api) — this module never constructs one.
 */
export type ApiClient = ModuleClient;

/** One flow with everything on it (FlowParts fragment union). */
export type FlowT = FlowPartsFragment;
/** One block incl. its blockElements (concrete-type casts — never "simplify" to interface casts). */
export type BlockT = BlockPartsFragment;
/** One element ("plugin" card) — 29 concrete typenames + runtime unknowns. */
export type ElementT = ElementPartsFragment;
/**
 * One edge. ConnectionID is synthesized per-request server-side — NEVER
 * persist or compare `id` across fetches; key on the parts instead (graph.ts
 * does).
 */
export type ConnectionT = ConnectionPartsFragment;

/** Narrow an element union member by __typename. */
export type ElementOf<T extends ElementT['__typename']> = Extract<ElementT, { __typename: T }>;

export type FlowDetail = FlowStructureQuery['bot']['flow'];
export type InboundLink = FlowDetail['inboundLinks'][number];

export type FlowGroupItem = FlowsListQuery['bot']['flowGroups'][number];
export type FlowListItem =
  | FlowsListQuery['bot']['flowsWithoutGroup'][number]
  | FlowsListQuery['bot']['defaultReplyFlows'][number]
  | FlowGroupItem['flows'][number];

/** The Test dock: one preview conversation pinned to this flow. */
export type TestSession = FlowTestStartMutation['previewResponsesStartInFlow'];
export type TestMessageNode = FlowTestMessagesQuery['bot']['conversation']['messages']['edges'][number]['node'];

/** Canvas selection: a block, optionally narrowed to one of its element cards. */
export interface Selection {
  blockId: string;
  elementId: string | null;
}

/** An edge dropped on empty canvas — the create-and-connect trigger. */
export interface DanglingEdge {
  sourceBlockID: string;
  /** Canvas handle id (`block` or `element::handle`), null when handle-less. */
  sourceHandle: string | null;
  /** Drop point in flow coordinates — where the new block should land. */
  position: { x: number; y: number };
  /** Drop point in viewport coordinates — where the picker should open. */
  client: { x: number; y: number };
}
