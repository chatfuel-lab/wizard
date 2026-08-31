import type { FuelyAutomationScope } from '~api/generated/automations/graphql';

/**
 * Picker drawers. One prop shape so the filter editors mount any of them by
 * name. Every picker is a controlled multi-select over ids:
 * the editor owns the draft list; the drawer only proposes a new list.
 */
export interface PickerDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Ids currently in the setting's draft. */
  selected: readonly string[];
  /** Replace the draft list. */
  onChange: (next: string[]) => void;
  maxItems: number;
  /** The scope decides the media kind (posts vs stories) and the ads platform. */
  scope: FuelyAutomationScope;
  canEdit: boolean;
}

/** Instagram posts+reels vs stories — the two ListOf* settings. */
export type MediaKind = 'posts' | 'stories';
