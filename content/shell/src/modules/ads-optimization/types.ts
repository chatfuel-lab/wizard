import type { ModuleClient } from '~api';
import type {
  AdsAutomationRefFragment,
  AdsEventFragment,
  AdsEventNameFragment,
  AdsEventSetPartsFragment,
  AdsSettingPartsFragment,
} from '~api/generated/ads-optimization/graphql';

export type ApiClient = ModuleClient;

/** A FuelyAutomation of the click-to-WhatsApp-ads scope, as the API returns it. */
export type EventSet = AdsEventSetPartsFragment;
export type Setting = AdsSettingPartsFragment;
/** One conversion reported to Meta. The union member says what fires it. */
export type ConversionEvent = AdsEventFragment;
export type ConversionName = AdsEventNameFragment;
export type AutomationRef = AdsAutomationRefFragment;

/**
 * One setting as this surface reads it: the value in force, and where it comes
 * from. `inheritsFrom` null means the set owns the value; a non-null one means
 * the value is the parent's and writing here takes a private copy of it.
 */
export interface SettingSlot<T> {
  value: T;
  inheritsFrom: AutomationRef | null;
  canInheritFrom: readonly AutomationRef[];
}

/**
 * A set, flattened for the UI. `ads` is null on the base set: the API strips
 * filter settings from a base automation, which is exactly what makes the base
 * set "every ad" rather than "no ads".
 */
export interface EventSetView {
  id: string;
  isBase: boolean;
  /** Null on the base set — it is named by the UI, not by the API. */
  name: string | null;
  enabled: boolean;
  updatedAt: string;
  ads: SettingSlot<readonly string[]> | null;
  events: SettingSlot<readonly ConversionEvent[]> | null;
}
