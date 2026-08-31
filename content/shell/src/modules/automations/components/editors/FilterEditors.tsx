import { useState } from 'react';
import { Button, ChipInput, IconCopy, IconImage, useToast } from '~ui';
import { FuelySettingKeywordsReactTo } from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { isFacebookScope } from '../../lib/scopes';
import { KEYWORDS_OPTIONS } from '../../lib/settingSummary';
import { MetaAdsDrawer } from '../pickers/MetaAdsDrawer';
import { parseAdIds } from '../../lib/adUrl';
import { LIMITS, STARTER_KEYWORDS, textLength } from '../../lib/limits';
import { MediaListEditor } from './MediaListEditor';
import { DraftFooter, Hint, ModeControl, useAutoFocus, useEditorDraft } from './shared';
import type { EditorProps } from './types';

/**
 * The five trigger settings a rule owns — every one a DRAFT with Save /
 * Cancel; every write replaces the whole list (no per-entry CRUD on the
 * server). The live limits are enforced in the draft's `write`
 * (`validateSettingUpdate`), the ChipInput's own ceilings keep the list from
 * growing past them in the first place.
 */

// ── 11. Look for keywords ──────────────────────────────────────────────────

export function KeywordsEditor({
  automation,
  setting,
  scope,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingKeywords'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const any = draft.value.reactTo === FuelySettingKeywordsReactTo.AnyComment;
  const stories = scope === 'InstagramStoryReplies';
  const noun = stories ? 'story reply' : 'comment';
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ModeControl
        value={draft.value.reactTo}
        options={KEYWORDS_OPTIONS}
        disabled={!canEdit}
        onChange={(reactTo) => draft.set((prev) => ({ ...prev, reactTo }))}
        aria-label="Which comments"
      />
      {any ? (
        <Hint>
          Every {noun} on the selected {stories ? 'stories' : 'posts'} triggers this rule.
        </Hint>
      ) : (
        <div className="flex flex-col gap-2">
          <ChipInput
            value={draft.value.keywords}
            onChange={(keywords) => draft.set((prev) => ({ ...prev, keywords }))}
            maxItems={LIMITS.keywords}
            maxLength={LIMITS.keyword}
            disabled={!canEdit}
            placeholder="Type a keyword and press Enter"
            aria-label="Keywords"
            invalid={draft.value.keywords.length === 0}
          />
          {draft.value.keywords.length === 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
              <span>Try:</span>
              {STARTER_KEYWORDS.map((word) => (
                <Button
                  key={word}
                  size="xs"
                  variant="outline"
                  disabled={!canEdit}
                  onClick={() => draft.set((prev) => ({ ...prev, keywords: [...prev.keywords, word] }))}
                >
                  {word}
                </Button>
              ))}
            </div>
          ) : (
            <Hint>Matching is case-insensitive. Paste a comma- or line-separated list to add several at once.</Hint>
          )}
        </div>
      )}
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}

// ── 12. Posts / 13. Stories ────────────────────────────────────────────────

export function ListOfPostsEditor({ automation, setting, canEdit, autoFocus }: EditorProps<'FuelySettingListOfPosts'>) {
  const draft = useEditorDraft(automation, setting);
  return (
    <MediaListEditor
      automation={automation}
      kind="posts"
      ids={draft.value.postIDs}
      onChange={(postIDs) => draft.set({ postIDs })}
      canEdit={canEdit}
      autoFocus={autoFocus}
      footer={<DraftFooter draft={draft} canEdit={canEdit} />}
    />
  );
}

export function ListOfStoriesEditor({
  automation,
  setting,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingListOfStories'>) {
  const draft = useEditorDraft(automation, setting);
  return (
    <MediaListEditor
      automation={automation}
      kind="stories"
      ids={draft.value.storyIDs}
      onChange={(storyIDs) => draft.set({ storyIDs })}
      canEdit={canEdit}
      autoFocus={autoFocus}
      footer={<DraftFooter draft={draft} canEdit={canEdit} />}
    />
  );
}

// ── 14. Ads ────────────────────────────────────────────────────────────────

export function ListOfAdsEditor({ automation, setting, canEdit, autoFocus }: EditorProps<'FuelySettingListOfAds'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ChipInput
        value={draft.value.adIDs}
        onChange={(adIDs) => draft.set({ adIDs })}
        maxItems={LIMITS.media}
        maxLength={LIMITS.mediaId}
        /* One paste can carry several ids — an Ads Manager URL lists them in
           `selected_ad_ids`. `separators` splits the text, `normalize` keeps the
           id out of each piece (`lib/adUrl.ts`). */
        normalize={(raw) => parseAdIds(raw)[0] ?? raw.trim()}
        validate={(id) =>
          textLength(id) > LIMITS.mediaId
            ? `An ad id is at most ${LIMITS.mediaId} characters`
            : /\s/.test(id)
              ? 'An ad id has no spaces'
              : null
        }
        disabled={!canEdit}
        placeholder="Paste an ad id or an Ads Manager URL"
        aria-label="Ad ids"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" disabled={!canEdit} onClick={() => setPickerOpen(true)}>
          <IconImage /> Pick from Meta ads
        </Button>
        <Hint>
          Paste an ad id or an Ads Manager URL — the id is taken from `selected_ad_ids`. An empty list means every ad.
        </Hint>
      </div>
      <MetaAdsDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={draft.value.adIDs}
        onChange={(adIDs) => draft.set({ adIDs })}
        maxItems={LIMITS.media}
        scope={automation.scope}
        canEdit={canEdit}
      />
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}

// ── 15. Ref links ──────────────────────────────────────────────────────────

export function RefLinksEditor({ automation, setting, canEdit, autoFocus }: EditorProps<'FuelySettingRefLinks'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const catalog = useCatalog();
  const toast = useToast();
  const facebook = isFacebookScope(automation.scope);
  const channel = catalog.channels.find((c) => c.platform === (facebook ? 'Facebook' : 'Instagram'));
  /* ig.me wants the username (the handle without "@"); m.me wants the page id. */
  const account = facebook ? channel?.accountId : channel?.handle?.replace(/^@/, '');
  const linkFor = (ref: string) =>
    facebook
      ? `m.me/${account ?? '<page>'}?ref=${encodeURIComponent(ref)}`
      : `ig.me/m/${account ?? '<handle>'}?ref=${encodeURIComponent(ref)}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(`https://${text}`);
      toast.show({ title: 'Copied', description: text, tone: 'success', duration: 2000 });
    } catch {
      toast.show({ title: 'Could not copy', description: 'Select the link and copy it by hand.', tone: 'warning' });
    }
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ChipInput
        value={draft.value.refs}
        onChange={(refs) => draft.set({ refs })}
        maxItems={LIMITS.refs}
        maxLength={LIMITS.ref}
        disabled={!canEdit}
        placeholder="Type a ref and press Enter (e.g. bio, spring-consult)"
        aria-label="Ref links"
      />
      {draft.value.refs.length === 0 ? (
        <Hint>
          With no refs this rule answers every {facebook ? 'm.me' : 'ig.me'} link. Add a ref to target one campaign
          link.
        </Hint>
      ) : (
        <ul className="flex flex-col gap-1">
          {draft.value.refs.map((ref) => (
            <li
              key={ref}
              className="flex items-center justify-between gap-2 rounded-control bg-surface-sunken px-2 py-1"
            >
              <code className="min-w-0 truncate font-mono text-xs text-text">{linkFor(ref)}</code>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void copy(linkFor(ref))}
                aria-label={`Copy the link for ${ref}`}
              >
                <IconCopy /> Copy
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!account && draft.value.refs.length > 0 ? (
        <Hint tone="warning">
          {facebook ? 'Connect a Facebook page' : 'Connect an Instagram account'} to see the full link.
        </Hint>
      ) : null}
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}
