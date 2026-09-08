/**
 * Changing a draft's kind — "send now" to "later" or back — when the pair
 * already exists.
 *
 * A draft is born as a scheduled pair. There is no mutation that turns one
 * entry point into the other, so the switch is: create the OTHER pair on
 * the same flow, replay the template onto its payload element when one is
 * set, and delete the old entry point. The flow keeps one entry point and
 * the list keeps one row throughout, because the list reads a flow as one
 * campaign whatever it holds.
 *
 * What was observed: `deleteBlock` removes either entry point (the
 * one-time block too, born enabled as it is); on a `WhatsAppTemplateBlock`
 * it answers a bare server error, and so does `blockElementDelete` on its
 * element. The old template block therefore stays in the flow, orphaned.
 * `findPayloadBlock` follows the entry point's connection and never sees it.
 */
import {
  BroadcastCreateOneTimeDocument,
  BroadcastCreateScheduledDocument,
  BroadcastDeleteBlockDocument,
  BroadcastSetOneTimeSegmentDocument,
  BroadcastSetScheduledSegmentDocument,
} from '~api/generated/broadcasts/graphql';
import type { CampaignsStore } from '../../hooks/useCampaignsStore';
import type { CampaignRecord } from '../../lib/campaign';
import { hasFilters, replayTemplate, segmentToInput } from '../../lib/duplicate';
import { errorMessage } from '../../lib/errors';
import type { ApiClient, CampaignFlow } from '../../types';

export type DraftKind = 'now' | 'scheduled';

export const draftKindOf = (record: CampaignRecord): DraftKind => (record.isOneTime ? 'now' : 'scheduled');

/** The pending key the name step watches while a switch runs. */
export const kindSwitchKey = (flowId: string): string => `kind:${flowId}`;

/** The entry point the new pair added, its settings element, and the template block it is connected to. */
export function newPairOf(
  flow: CampaignFlow,
  oldEntryBlockId: string,
): { entryBlockId: string; settingsElementId: string | null; payloadElementId: string | null } | null {
  const entry = flow.entryPoints.find((point) => point.id !== oldEntryBlockId);
  if (!entry) return null;
  const entryBlock = flow.blocks.find((block) => block.id === entry.id);
  const settings = entryBlock?.blockElements.find(
    (candidate) =>
      candidate.__typename === 'WhatsAppOneTimeNotificationBlockElement' ||
      candidate.__typename === 'WhatsAppScheduledMessageBlockElement',
  );
  const target = flow.connections.find((connection) => connection.sourceBlockID === entry.id)?.targetBlockID;
  const payload = target ? flow.blocks.find((block) => block.id === target) : undefined;
  const element = payload?.blockElements.find((candidate) => candidate.__typename === 'WhatsAppTemplateBlockElement');
  return { entryBlockId: entry.id, settingsElementId: settings?.id ?? null, payloadElementId: element?.id ?? null };
}

/**
 * Switch the draft to `kind`. Resolves with what did not make it onto the
 * new pair (the replays' refusals); rejects when the pair could not be made
 * or the old entry point could not be removed — in which case the flow is
 * re-read so the list shows whatever is true.
 *
 * The whole switch is ONE pending span on the store: the flow holds two
 * entry points from the create to the delete, and the kind control stays
 * disabled for all of it so a second switch cannot start on top.
 */
export async function switchKind(
  store: CampaignsStore,
  client: ApiClient,
  record: CampaignRecord,
  kind: DraftKind,
): Promise<string[]> {
  if (draftKindOf(record) === kind) return [];
  const key = kindSwitchKey(record.flowId);
  const flowID = record.flowId;
  if (record.settings.enabled && !record.isOneTime) await store.disable(record);

  const failures: string[] = [];
  await store.writeFlow(key, async () => {
    const withPair =
      kind === 'now'
        ? (await client.mutate(BroadcastCreateOneTimeDocument, { flowID }))
            .whatsAppOneTimeNotificationCreateWithBlockAndWATemplate
        : (await client.mutate(BroadcastCreateScheduledDocument, { flowID }))
            .whatsAppScheduledMessageCreateWithBlockAndWATemplate;
    const fresh = newPairOf(withPair, record.settings.blockId);
    if (!fresh) {
      await store.refetchFlow(flowID);
      throw new Error('Chatfuel made the new entry point but did not say which block it is.');
    }

    const template = record.payload?.template ?? null;
    if (template && fresh.payloadElementId) {
      try {
        const replayed = await replayTemplate(client, fresh.payloadElementId, template);
        failures.push(...replayed.failures);
      } catch (err) {
        failures.push(errorMessage(err));
      }
    }

    /* The audience lives on the entry point, so the new one is born with
       everyone; what the old one held is written onto it. */
    const segment = segmentToInput(record.audience.segment, `broadcasts/${flowID}`);
    if (hasFilters(segment) && fresh.settingsElementId) {
      try {
        if (kind === 'now')
          await client.mutate(BroadcastSetOneTimeSegmentDocument, { elementID: fresh.settingsElementId, segment });
        else await client.mutate(BroadcastSetScheduledSegmentDocument, { elementID: fresh.settingsElementId, segment });
      } catch (err) {
        failures.push(errorMessage(err));
      }
    }

    try {
      const data = await client.mutate(BroadcastDeleteBlockDocument, { flowID, blockID: record.settings.blockId });
      return data.deleteBlock;
    } catch (err) {
      await store.refetchFlow(flowID);
      throw err;
    }
  });
  return failures;
}
