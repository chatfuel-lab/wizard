/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Two consumers read this list — `useHotkeys` (what fires) and the `?` sheet
 * (what is documented) — and `shortcuts.test.ts` asserts they cover each
 * other exactly, so a key cannot be taught without being wired or wired
 * without being taught.
 */
import type { HotkeyBinding } from '~ui';

export type ShortcutId =
  'palette' | 'help' | 'search' | 'refresh' | 'newCampaign' | 'prev' | 'next' | 'close' | 'goCampaigns' | 'goTemplates';

export type ShortcutSection = 'Global' | 'Campaigns' | 'Sections';

export const BINDINGS: HotkeyBinding<ShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'newCampaign', keys: 'n' },
  { id: 'prev', keys: '[' },
  { id: 'next', keys: ']' },
  { id: 'close', keys: 'escape' },
  { id: 'goCampaigns', keys: 'g c' },
  { id: 'goTemplates', keys: 'g t' },
];

export interface ShortcutRow {
  ids: readonly ShortcutId[];
  label: string;
  section: ShortcutSection;
  chips: readonly (readonly string[])[];
  joiner?: string;
  note?: string;
}

export const SHORTCUT_ROWS: ShortcutRow[] = [
  {
    ids: ['palette'],
    label: 'Command palette',
    section: 'Global',
    chips: [['mod', 'k']],
    note: 'Works inside a text field too.',
  },
  { ids: ['newCampaign'], label: 'New campaign', section: 'Global', chips: [['n']] },
  { ids: ['search'], label: 'Search', section: 'Global', chips: [['/']] },
  { ids: ['refresh'], label: 'Refresh', section: 'Global', chips: [['r']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },
  {
    ids: ['prev', 'next'],
    label: 'Previous / next campaign',
    section: 'Campaigns',
    chips: [['['], [']']],
    joiner: 'or',
  },
  { ids: ['close'], label: 'Close the panel', section: 'Campaigns', chips: [['esc']] },
  { ids: ['goCampaigns'], label: 'Campaigns', section: 'Sections', chips: [['g', 'c']] },
  { ids: ['goTemplates'], label: 'Templates', section: 'Sections', chips: [['g', 't']] },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = ['Global', 'Campaigns', 'Sections'];
