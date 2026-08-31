import { useId } from 'react';
import { Switch, Textarea } from '~ui';
import {
  FuelySettingPrivateReplyHowToReply,
  FuelySettingPublicReplyHowToReply,
} from '~api/generated/automations/graphql';
import { isFacebookScope } from '../../lib/scopes';
import { PRIVATE_REPLY_OPTIONS, PUBLIC_REPLY_OPTIONS } from '../../lib/settingSummary';
import { LIMITS } from '../../lib/limits';
import { DraftFooter, FieldLabel, Hint, ModeControl, useAutoFocus, useEditorDraft } from './shared';
import type { EditorProps } from './types';

/**
 * The two comment-scope reply settings — DRAFTS with Save / Cancel.
 *
 * Each carries TWO texts (`messagePrompt` for "using AI", `exactTextReply`
 * for "exact text") and the API validates BOTH on every write, whatever the
 * mode says (live: `FuelyReplyExactTextEmpty` even when the mode is UsingAI).
 * So the editor shows only the field the chosen mode needs and keeps the
 * other value in the draft untouched — the write always carries both, and
 * "Don't reply" carries whatever was there. `likeContactComment` is
 * Facebook-only (`FuelyLikeContactCommentNotAllowed` elsewhere) and is part
 * of the same draft.
 */

// ── 10. Reply in DMs ───────────────────────────────────────────────────────

export function PrivateReplyEditor({
  automation,
  setting,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingPrivateReply'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const id = useId();
  const mode = draft.value.privateReplyHowToReply;
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ModeControl
        value={mode}
        options={PRIVATE_REPLY_OPTIONS}
        disabled={!canEdit}
        onChange={(privateReplyHowToReply) => draft.set((prev) => ({ ...prev, privateReplyHowToReply }))}
        aria-label="Reply in DMs"
      />
      {mode === FuelySettingPrivateReplyHowToReply.UsingAi ? (
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={id}>Instructions for the DM</FieldLabel>
          <Textarea
            id={id}
            value={draft.value.messagePrompt}
            onChange={(event) => draft.set((prev) => ({ ...prev, messagePrompt: event.target.value }))}
            autoGrow
            rows={3}
            maxRows={20}
            maxLength={LIMITS.replyPrompt}
            showCount
            disabled={!canEdit}
            placeholder="Open with a friendly line about their comment, then answer the question it contained…"
          />
        </div>
      ) : mode === FuelySettingPrivateReplyHowToReply.ExactText ? (
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={id}>The exact message</FieldLabel>
          <Textarea
            id={id}
            value={draft.value.exactTextReply}
            onChange={(event) => draft.set((prev) => ({ ...prev, exactTextReply: event.target.value }))}
            autoGrow
            rows={2}
            maxRows={12}
            maxLength={LIMITS.exactText}
            showCount
            disabled={!canEdit}
            placeholder="Thanks for your comment! I sent you the details in a DM."
          />
        </div>
      ) : (
        <Hint>No direct message is sent to people who comment.</Hint>
      )}
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}

// ── 9. Public comment replies ──────────────────────────────────────────────

export function PublicReplyEditor({
  automation,
  setting,
  scope,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingPublicReply'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const id = useId();
  const mode = draft.value.publicReplyHowToReply;
  const facebook = isFacebookScope(scope);
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ModeControl
        value={mode}
        options={PUBLIC_REPLY_OPTIONS}
        disabled={!canEdit}
        onChange={(publicReplyHowToReply) => draft.set((prev) => ({ ...prev, publicReplyHowToReply }))}
        aria-label="Public comment replies"
      />
      {mode === FuelySettingPublicReplyHowToReply.UsingAi ? (
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={id}>Instructions for the public reply</FieldLabel>
          <Textarea
            id={id}
            value={draft.value.messagePrompt}
            onChange={(event) => draft.set((prev) => ({ ...prev, messagePrompt: event.target.value }))}
            autoGrow
            rows={3}
            maxRows={20}
            maxLength={LIMITS.replyPrompt}
            showCount
            disabled={!canEdit}
            placeholder="Reply publicly in one short sentence and point to the DM…"
          />
        </div>
      ) : mode === FuelySettingPublicReplyHowToReply.ExactText ? (
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={id}>The exact reply</FieldLabel>
          <Textarea
            id={id}
            value={draft.value.exactTextReply}
            onChange={(event) => draft.set((prev) => ({ ...prev, exactTextReply: event.target.value }))}
            autoGrow
            rows={2}
            maxRows={12}
            maxLength={LIMITS.exactText}
            showCount
            disabled={!canEdit}
            placeholder="Thanks! Check your DMs 💌"
          />
        </div>
      ) : (
        <Hint>Nothing is posted under the comment.</Hint>
      )}
      {facebook ? (
        <Switch
          checked={draft.value.likeContactComment}
          disabled={!canEdit}
          label="Like the comment"
          onChange={(likeContactComment) => draft.set((prev) => ({ ...prev, likeContactComment }))}
        />
      ) : null}
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}
