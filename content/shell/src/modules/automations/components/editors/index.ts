/**
 * The registry: typename → editor. `register.ts` fills all 15 entries when it
 * is imported for its side effect (from `components/channels/ChannelsView.tsx`,
 * the one place a `SettingSection` is first mounted from). A typename the
 * module does not edit (`FuelySettingSendEventsToMeta`) has no entry on
 * purpose — `editorFor` returns null and the row says "Managed in the
 * Chatfuel dashboard".
 */
import type { KnownSettingTypename, SettingTypename } from '../../types';
import type { EditorComponent } from './types';

const SETTING_EDITORS: Partial<Record<KnownSettingTypename, EditorComponent<never>>> = {};

export function registerEditor<T extends KnownSettingTypename>(typename: T, editor: EditorComponent<T>): void {
  (SETTING_EDITORS as Record<string, EditorComponent<never>>)[typename] = editor as unknown as EditorComponent<never>;
}

export function editorFor(typename: SettingTypename): EditorComponent<never> | null {
  return (SETTING_EDITORS as Partial<Record<string, EditorComponent<never>>>)[typename] ?? null;
}
