import { describe, expect, it } from 'vitest';
import { outletLabels } from './edgeLabels';
import { toGraph } from './graph';
import { templateStrFromString } from './templateStr';
import type { ConnectionT, FlowT } from '../types';

const blocksOf = (subject: FlowT) => subject.blocks;

/* Button titles are `TemplateStr`, not strings — they can carry attribute
   interpolations. Handing `extractHandles` a bare string throws, which is how
   this test found out. */
const buttons = (id: string, titles: string[]) =>
  ({
    __typename: 'WidgetTextAndButtonBlockElement',
    id,
    buttons: titles.map((title, index) => ({
      id: `btn-${index}`,
      title: templateStrFromString(title),
    })),
  }) as unknown;

const flow = (elements: unknown[], connections: ConnectionT[] = []): FlowT =>
  ({
    id: 'flow-1',
    name: 'Flow',
    platform: 'widget',
    blocks: [
      {
        __typename: 'RegularContentBlock',
        id: 'b1',
        name: 'Block 1',
        positionX: 0,
        positionY: 0,
        platform: 'widget',
        isStartingPoint: true,
        blockElements: elements,
      },
      {
        __typename: 'RegularContentBlock',
        id: 'b2',
        name: 'Block 2',
        positionX: 300,
        positionY: 0,
        platform: 'widget',
        isStartingPoint: false,
        blockElements: [],
      },
    ],
    connections,
  }) as unknown as FlowT;

describe('outletLabels', () => {
  it('labels a component edge with the outlet it leaves from', () => {
    const labels = outletLabels(blocksOf(flow([buttons('el-1', ['Yes', 'No'])])));
    expect(labels.get('c2b:el-1:btn-0')).toBe('Yes');
    expect(labels.get('c2b:el-1:btn-1')).toBe('No');
  });

  /* The important one. `toGraph` mints edge ids and this mints label keys, in
     two different files, and the whole feature is silently dead if they ever
     stop agreeing — no crash, no test failure, just unlabelled lines. */
  it('keys by exactly the edge id toGraph mints', () => {
    const connections: ConnectionT[] = [
      {
        __typename: 'ComponentToBlockConnection',
        id: 'per-request-id-never-used-as-a-key',
        sourceBlockID: 'b1',
        sourceBlockElementID: 'el-1',
        sourceHandleID: 'btn-1',
        targetBlockID: 'b2',
      } as unknown as ConnectionT,
    ];
    const subject = flow([buttons('el-1', ['Yes', 'No'])], connections);
    const [edge] = toGraph(subject).edges;
    expect(edge).toBeDefined();
    expect(outletLabels(subject.blocks).get(edge.id)).toBe('No');
  });

  it('has nothing to say about block-level edges', () => {
    const connections: ConnectionT[] = [
      {
        __typename: 'BlockToBlockConnection',
        id: 'per-request',
        sourceBlockID: 'b1',
        targetBlockID: 'b2',
      } as unknown as ConnectionT,
    ];
    const subject = flow([], connections);
    const [edge] = toGraph(subject).edges;
    expect(edge).toBeDefined();
    expect(outletLabels(subject.blocks).get(edge.id)).toBeUndefined();
  });

  it('is empty rather than throwing on elements with no outlets', () => {
    expect(outletLabels(blocksOf(flow([{ __typename: 'WhatsAppTextBlockElement', id: 'el-9' }]))).size).toBe(0);
  });
});
