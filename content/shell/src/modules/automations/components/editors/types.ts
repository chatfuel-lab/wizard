import type { ComponentType } from 'react';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { AutomationRecord, KnownSettingTypename, SettingOf } from '../../types';

/**
 * The contract every setting editor takes, so the Default card and the rule
 * card can both mount an editor by typename without knowing which one.
 *
 * An editor reads the resolved value from `setting`, decides on its own save
 * model (immediate for switches / selects / radios via `mutations.saveSetting`;
 * a draft via `useSettingDraft` for prompts and lists — see `lib/drafts.ts`),
 * and renders inheritance through the shared `InheritanceRow`. It never
 * touches the URL and never toasts on a draft error (inline instead).
 */
export interface EditorProps<T extends KnownSettingTypename = KnownSettingTypename> {
  automation: AutomationRecord;
  setting: SettingOf<T>;
  scope: FuelyAutomationScope;
  canEdit: boolean;
  /** Focus the first control on mount (deep link `?setting=`). */
  autoFocus?: boolean;
}

export type EditorComponent<T extends KnownSettingTypename = KnownSettingTypename> = ComponentType<EditorProps<T>>;
