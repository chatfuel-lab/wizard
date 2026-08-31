import { useEffect, useState } from 'react';
import { Button, ChipInput, IconImage, IconInstagram, SegmentedControl, Tooltip } from '~ui';
import { useCatalog } from '../../AutomationsCatalogContext';
import { LIMITS } from '../../lib/limits';
import { isFacebookScope, platformOf } from '../../lib/scopes';
import type { AutomationRecord } from '../../types';
import { FacebookPostsDrawer } from '../pickers/FacebookPostsDrawer';
import { InstagramMediaDrawer } from '../pickers/InstagramMediaDrawer';
import type { MediaKind, PickerDrawerProps } from '../pickers/types';
import { Hint, useAutoFocus } from './shared';

const MEDIA_WORDS: Record<MediaKind, { all: string; specific: string; noun: string; plural: string }> = {
  posts: { all: 'All posts', specific: 'Specific posts', noun: 'post', plural: 'posts' },
  stories: { all: 'All stories', specific: 'Specific stories', noun: 'story', plural: 'stories' },
};

/**
 * The shared body of Posts and Stories: "All / Specific" (an empty list IS
 * "all" on the wire), a chip list of the picked ids, and the platform's
 * picker drawer. Not connected → the picker is disabled with the reason and
 * the list is read-only (the API would refuse the save with
 * `FuelyListOf*NoConnectedAccount` anyway).
 *
 * The chip shows the raw id + the platform glyph; the richer lookup
 * (`useMediaLookup` — thumbnail + caption through `instagramAccount.media(id)`)
 * drives the picker drawer, not the chips.
 */
export function MediaListEditor({
  automation,
  kind,
  ids,
  onChange,
  canEdit,
  autoFocus,
  footer,
}: {
  automation: AutomationRecord;
  kind: MediaKind;
  ids: readonly string[];
  onChange: (next: string[]) => void;
  canEdit: boolean;
  autoFocus?: boolean;
  footer: React.ReactNode;
}) {
  const rootRef = useAutoFocus(autoFocus);
  const catalog = useCatalog();
  const scope = automation.scope;
  const facebook = isFacebookScope(scope);
  const platform = platformOf(scope);
  const channel = catalog.channels.find((c) => c.platform === platform);
  const connected = Boolean(channel?.connected);
  const words = MEDIA_WORDS[kind];
  const [pickerOpen, setPickerOpen] = useState(false);
  /* "Specific" with nothing picked yet is a UI state, not a value: the wire
     has no way to say it. It flips on by itself the moment an id lands. */
  const [specific, setSpecific] = useState(ids.length > 0);
  useEffect(() => {
    if (ids.length > 0) setSpecific(true);
  }, [ids.length]);

  const Drawer = facebook ? FacebookPostsDrawer : InstagramMediaDrawer;
  const pickerProps: PickerDrawerProps = {
    open: pickerOpen,
    onClose: () => setPickerOpen(false),
    selected: ids,
    onChange,
    maxItems: LIMITS.media,
    scope,
    canEdit,
  };
  const pickLabel = facebook ? 'Pick from the page' : 'Pick from Instagram';
  const notConnected = facebook
    ? 'Connect a Facebook page to pick posts'
    : `Connect an Instagram account to pick ${words.plural}`;

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <SegmentedControl<'all' | 'specific'>
        value={specific ? 'specific' : 'all'}
        size="sm"
        aria-label={`Which ${words.plural}`}
        options={[
          { value: 'all', label: words.all, disabled: !canEdit },
          { value: 'specific', label: words.specific, disabled: !canEdit || !connected },
        ]}
        onChange={(next) => {
          if (next === 'all') {
            setSpecific(false);
            if (ids.length > 0) onChange([]);
          } else {
            setSpecific(true);
          }
        }}
      />
      {!connected ? (
        <Hint tone="warning">
          {notConnected} — until then this rule reacts on every {words.noun}.
        </Hint>
      ) : null}
      {specific ? (
        <div className="flex flex-col gap-2">
          <ChipInput
            value={ids}
            onChange={onChange}
            maxItems={LIMITS.media}
            maxLength={LIMITS.mediaId}
            disabled={!canEdit}
            readOnly={!connected}
            placeholder={`Paste a ${words.noun} id, or pick below`}
            aria-label={`Picked ${words.plural}`}
            renderChip={(id) => (
              <span className="inline-flex items-center gap-1">
                <IconInstagram size={12} className={facebook ? 'text-channel-facebook' : 'text-channel-instagram'} />
                <span className="font-mono">{id}</span>
              </span>
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip label={notConnected} disabled={connected}>
              <Button
                size="sm"
                variant="secondary"
                disabled={!canEdit || !connected}
                onClick={() => setPickerOpen(true)}
              >
                <IconImage /> {pickLabel}
              </Button>
            </Tooltip>
            {ids.length === 0 ? (
              <Hint>
                Pick at least one {words.noun} — with none picked this stays “{words.all}”.
              </Hint>
            ) : null}
          </div>
        </div>
      ) : null}
      {facebook ? <Hint>You can also paste a Facebook post id directly.</Hint> : null}
      <Drawer {...pickerProps} />
      {footer}
    </div>
  );
}
