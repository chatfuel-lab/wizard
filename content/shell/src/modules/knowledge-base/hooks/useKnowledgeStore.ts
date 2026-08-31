import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { ModuleClient } from '~api';
import {
  KbSetAddressDocument,
  KbSetAdditionalInstructionsDocument,
  KbSetBusinessHoursDocument,
  KbSetCompanyNameDocument,
  KbSetEmailDocument,
  KbSetFaQsDocument,
  KbSetHowToPayDocument,
  KbSetPhoneDocument,
  KbSetWebsiteDocument,
  KnowledgeBaseDocument,
} from '~api/generated/knowledge-base/graphql';
import { isLimitError, messageFor } from '../lib/errors';
import { faqsDiffer, initialKnowledgeState, knowledgeReducer, type KnowledgeState } from '../lib/knowledgeStore';
import type { BusinessField } from '../lib/profileFields';
import type { FaqEntry, KnowledgeBaseInfo, UsageInfo, WorkingHoursDay } from '../types';

/** The result of a replace-all FAQ write. A conflict carries what the server actually holds. */
export type FaqSaveResult = { ok: true } | { ok: false; conflict: FaqEntry[] };

export interface KnowledgeStore {
  state: KnowledgeState;
  /** Re-issue every read. Bumps the epoch, so responses in flight are dropped. */
  refetch: () => void;
  saveField: (field: BusinessField, value: string) => Promise<void>;
  saveSchedule: (workingHours: readonly WorkingHoursDay[]) => Promise<void>;
  /**
   * Replace the whole FAQ list.
   *
   * `baseline` is what the caller's draft was built from. The list is re-read
   * immediately before the write, and if it moved in the meantime the save is
   * refused and the live list handed back - the API is last-write-wins and a
   * silent overwrite of somebody else's edit is not a save, it is a loss.
   * Pass no baseline to write unconditionally.
   */
  saveFaqs: (next: readonly FaqEntry[], baseline?: readonly FaqEntry[]) => Promise<FaqSaveResult>;
  /**
   * The catalog's writes answer with the new `usage`, and the header's
   * character counter is this store's. Handing it over here is what keeps the
   * budget moving when a product is added without re-reading the whole record.
   */
  applyUsage: (usage: UsageInfo) => void;
  /**
   * "That write failed because the knowledge base is full." Every setter in
   * here already reports it; the catalog's mutations live in their own hooks
   * and report it through this.
   */
  noteLimit: (error: unknown) => void;
}

/**
 * The Fuely record: business info, opening hours, instructions, FAQs and the
 * character budget.
 *
 * There is NO subscription for any of it - the schema has one Fuely
 * subscription and it belongs to the automations module - so freshness is:
 * every setter response is merged back (which is also how the budget counter
 * moves without a refetch), a reconnect refetches, and the header has a
 * Refresh button. Nothing here pretends to be live.
 */
export function useKnowledgeStore(client: ModuleClient, botId: string): KnowledgeStore {
  const [state, dispatch] = useReducer(knowledgeReducer, initialKnowledgeState);

  /* The epoch bump IS the request: `refetch` only dispatches `reset`, and the
   * load effect keyed on `state.epoch` issues the query. */
  const refetch = useCallback(() => dispatch({ type: 'reset' }), []);

  useEffect(() => {
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(KnowledgeBaseDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        const config = data.bot.fuelyConfig;
        if (!config) {
          dispatch({ type: 'unavailable', epoch });
          return;
        }
        dispatch({ type: 'loaded', epoch, kb: config.knowledgeBase, usage: config.usage });
      })
      .catch((error: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, error: messageFor(error) });
      });
    return () => {
      cancelled = true;
    };
    /* `state.epoch` is the request key on purpose - see the comment above. */
  }, [client, botId, state.epoch]);

  /* The one thing a reconnect can do here: ask again. */
  useEffect(() => client.onReconnect(refetch), [client, refetch]);

  /* A limit error is the only way to learn the knowledge base is full - the
   * schema has no ceiling to compare against. Recorded once, cleared by the
   * next clean load. */
  const note = useCallback((error: unknown) => {
    if (isLimitError(error)) dispatch({ type: 'limitHit' });
  }, []);

  /**
   * One granular mutation per field - there is no bulk update on the server.
   *
   * A switch and not a document map: the generated documents are typed
   * one-to-one with their own variables, so a `Record<field, doc>` collapses to
   * a union that no `mutate` call can satisfy without an `as never` that would
   * throw the variable checking away along with it.
   *
   * Every arm merges the setter's own response back, which is also how the
   * character counter in the header moves without a refetch.
   */
  const saveField = useCallback(
    async (field: BusinessField, value: string) => {
      const merge = (config: { knowledgeBase: Partial<KnowledgeBaseInfo>; usage: UsageInfo } | null | undefined) => {
        if (config) dispatch({ type: 'kbPatched', kb: config.knowledgeBase, usage: config.usage });
      };
      try {
        switch (field) {
          case 'companyName':
            return merge(
              (await client.mutate(KbSetCompanyNameDocument, { botID: botId, companyName: value }))
                .fuelyConfigSetCompanyName.fuelyConfig,
            );
          case 'phone':
            return merge(
              (await client.mutate(KbSetPhoneDocument, { botID: botId, phone: value })).fuelyConfigSetPhone.fuelyConfig,
            );
          case 'email':
            return merge(
              (await client.mutate(KbSetEmailDocument, { botID: botId, email: value })).fuelyConfigSetEmail.fuelyConfig,
            );
          case 'address':
            return merge(
              (await client.mutate(KbSetAddressDocument, { botID: botId, address: value })).fuelyConfigSetAddress
                .fuelyConfig,
            );
          case 'website':
            return merge(
              (await client.mutate(KbSetWebsiteDocument, { botID: botId, website: value })).fuelyConfigSetWebsite
                .fuelyConfig,
            );
          case 'howToPay':
            return merge(
              (await client.mutate(KbSetHowToPayDocument, { botID: botId, howToPay: value })).fuelyConfigSetHowToPay
                .fuelyConfig,
            );
          case 'additionalInstructions':
            return merge(
              (
                await client.mutate(KbSetAdditionalInstructionsDocument, {
                  botID: botId,
                  additionalInstructions: value,
                })
              ).fuelyConfigSetAdditionalInstructions.fuelyConfig,
            );
        }
      } catch (error) {
        note(error);
        throw error;
      }
    },
    [client, botId, note],
  );

  const saveSchedule = useCallback(
    async (workingHours: readonly WorkingHoursDay[]) => {
      try {
        const data = await client.mutate(KbSetBusinessHoursDocument, {
          botID: botId,
          schedule: {
            workingHours: workingHours.map(({ day, enabled, start, end }) => ({ day, enabled, start, end })),
          },
        });
        const config = data.fuelyConfigSetBusinessHoursSchedule.fuelyConfig;
        if (config)
          dispatch({
            type: 'kbPatched',
            kb: { businessHoursSchedule: config.knowledgeBase.businessHoursSchedule },
            usage: config.usage,
          });
      } catch (error) {
        note(error);
        throw error;
      }
    },
    [client, botId, note],
  );

  const saveFaqs = useCallback<KnowledgeStore['saveFaqs']>(
    async (next, baseline) => {
      const live = await client.query(KnowledgeBaseDocument, { botID: botId });
      const config = live.bot.fuelyConfig;
      if (!config) throw new Error('This bot has no AI configuration.');
      if (baseline && faqsDiffer(config.knowledgeBase.faqs, baseline)) {
        return { ok: false, conflict: [...config.knowledgeBase.faqs] };
      }
      try {
        const data = await client.mutate(KbSetFaQsDocument, {
          botID: botId,
          faqs: next.map(({ question, answer }) => ({ question, answer })),
        });
        const saved = data.fuelyConfigSetFAQs.fuelyConfig;
        if (saved) dispatch({ type: 'faqsReplaced', faqs: saved.knowledgeBase.faqs, usage: saved.usage });
        return { ok: true };
      } catch (error) {
        note(error);
        throw error;
      }
    },
    [client, botId, note],
  );

  const applyUsage = useCallback((usage: UsageInfo) => dispatch({ type: 'usagePatched', usage }), []);

  return useMemo(
    () => ({ state, refetch, saveField, saveSchedule, saveFaqs, applyUsage, noteLimit: note }),
    [state, refetch, saveField, saveSchedule, saveFaqs, applyUsage, note],
  );
}
