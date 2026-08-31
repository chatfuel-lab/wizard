import { describe, expect, it } from 'vitest';
import { NEW_FLOW_PLATFORMS, dropFlow, patchName, pickNewFlowId } from './flowList';
import { Platform } from '~api/generated/flow-builder/graphql';

const flows = (...ids: string[]) => ids.map((id) => ({ id }));

describe('pickNewFlowId', () => {
  it('finds the id that was not there before', () => {
    expect(pickNewFlowId(flows('a', 'b'), flows('a', 'b', 'c'))).toBe('c');
  });

  it('takes the last new one when a teammate created at the same moment', () => {
    // The server appends, so ours is the later of the two.
    expect(pickNewFlowId(flows('a'), flows('a', 'theirs', 'ours'))).toBe('ours');
  });

  it('answers null when nothing new came back', () => {
    // A refusal the caller has to treat as one, not an excuse to open flow 'a'.
    expect(pickNewFlowId(flows('a', 'b'), flows('a', 'b'))).toBeNull();
  });

  it('is not fooled by a flow disappearing while the create ran', () => {
    expect(pickNewFlowId(flows('a', 'b'), flows('b'))).toBeNull();
  });
});

describe('the channels on offer', () => {
  it('offers every platform the schema has', () => {
    expect([...NEW_FLOW_PLATFORMS].sort()).toEqual(Object.values(Platform).sort());
  });

  it('leads with the one most flows are built for', () => {
    expect(NEW_FLOW_PLATFORMS[0]).toBe(Platform.Whatsapp);
  });
});

const buckets = () =>
  ({
    groups: [{ __typename: 'FlowGroup' as const, id: 'g1', name: 'Onboarding', flows: [{ id: 'a', name: 'A' }] }],
    ungrouped: [{ id: 'b', name: 'B' }],
    defaultReply: [{ id: 'c', name: 'C' }],
    loading: false,
    error: null,
  }) as unknown as Parameters<typeof patchName>[0];

const names = (state: ReturnType<typeof buckets>) => [
  ...state.groups.flatMap((group) => group.flows.map((flow) => flow.name)),
  ...state.ungrouped.map((flow) => flow.name),
  ...state.defaultReply.map((flow) => flow.name),
];
const ids = (state: ReturnType<typeof buckets>) => [
  ...state.groups.flatMap((group) => group.flows.map((flow) => flow.id)),
  ...state.ungrouped.map((flow) => flow.id),
  ...state.defaultReply.map((flow) => flow.id),
];

describe('patchName', () => {
  it('reaches a flow inside a group', () => {
    // The miss no type catches: a grouped flow keeping its old name until reload.
    expect(names(patchName(buckets(), 'a', 'Renamed'))).toEqual(['Renamed', 'B', 'C']);
  });

  it('reaches the flat buckets too', () => {
    expect(names(patchName(buckets(), 'b', 'Renamed'))).toEqual(['A', 'Renamed', 'C']);
    expect(names(patchName(buckets(), 'c', 'Renamed'))).toEqual(['A', 'B', 'Renamed']);
  });

  it('leaves everything alone when the id is not there', () => {
    expect(names(patchName(buckets(), 'nope', 'Renamed'))).toEqual(['A', 'B', 'C']);
  });
});

describe('dropFlow', () => {
  it('removes a flow from inside its group', () => {
    expect(ids(dropFlow(buckets(), 'a'))).toEqual(['b', 'c']);
  });

  it('removes one from either flat bucket', () => {
    expect(ids(dropFlow(buckets(), 'b'))).toEqual(['a', 'c']);
    expect(ids(dropFlow(buckets(), 'c'))).toEqual(['a', 'b']);
  });

  it('keeps the group itself, empty', () => {
    // A group with nothing in it is still a group; the rail hides it, the server keeps it.
    expect(dropFlow(buckets(), 'a').groups).toHaveLength(1);
  });
});
