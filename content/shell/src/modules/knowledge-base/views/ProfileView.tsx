import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, PageBody, Skeleton } from '~ui';
import { useDrafts } from '../KnowledgeBaseDraftContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { OpeningHoursCard } from '../components/profile/OpeningHoursCard';
import { ProfileFieldRow } from '../components/profile/ProfileFieldRow';
import { SectionSaveBar } from '../components/profile/SectionSaveBar';
import { useSourceDirty } from '../hooks/useSourceDirty';
import { PROFILE_FIELDS } from '../lib/profileFields';
import type { KnowledgeViewProps } from './types';

/**
 * The business profile: six fields and the opening hours.
 *
 * Every one of them is a separate mutation on the server — there is no bulk
 * update — but a person edits a profile, not seven settings, so the page holds
 * seven drafts and ONE Save. The registry is what joins them: each row
 * registers itself, `drafts.saveAll()` writes the dirty ones one at a time
 * (the Fuely config takes one write at a time), and the same registration is
 * what makes ⌘S, the header's unsaved badge and the leave-the-source guard
 * work without this page telling any of them anything.
 *
 * `saveAll` is the whole registry rather than this page's rows because exactly
 * one source page is mounted at a time (`SourcesView` keys the view on the
 * source), so every registered draft belongs to this page.
 */
export function ProfileView({ onBusy, canEditHere }: KnowledgeViewProps) {
  const store = useKnowledge();
  const drafts = useDrafts();
  const dirty = useSourceDirty('profile');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Nothing on this page loads on its own; the store's own loading already
     spins the header. Saying so keeps a previous page's spinner from sticking. */
  useEffect(() => onBusy(false), [onBusy]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await drafts.saveAll();
    setSaving(false);
    /* Each row shows its own message; this only says how much did not land. */
    if (result.failed.length > 0) {
      setError(
        result.failed.length === 1
          ? 'One change could not be saved — see the message under it.'
          : `${result.failed.length} changes could not be saved — see the messages under them.`,
      );
    }
  }, [drafts]);

  const cancel = useCallback(() => {
    drafts.discardAll();
    setError(null);
  }, [drafts]);

  const kb = store.state.kb;
  if (!kb) {
    return (
      <PageBody measure="form">
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading the business profile">
          <Skeleton variant="block" height="18rem" />
          <Skeleton variant="block" height="14rem" />
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody measure="form">
      <div className="flex flex-col gap-4">
        {!canEditHere ? (
          <Alert tone="info" title="Read only">
            Your role can read this bot’s knowledge base but not change it — editing needs the Ai · Edit permission.
          </Alert>
        ) : null}

        <Card title="Business profile">
          {/* gap-3, not the gap-5 this started at: the spacing was measured
              around a label + hint + control block, and with the hint gone it
              was holding the fields a caption's worth of air apart. */}
          <div className="flex flex-col gap-3">
            {PROFILE_FIELDS.map((field) => (
              <ProfileFieldRow key={field} field={field} serverValue={kb[field] ?? ''} canEdit={canEditHere} />
            ))}
          </div>
        </Card>

        <OpeningHoursCard schedule={kb.businessHoursSchedule.workingHours} canEdit={canEditHere} />

        {/* Pinned, but only while it has something to say — an empty strip
            parked at the bottom of every profile is furniture. */}
        {canEditHere && (dirty > 0 || error) ? (
          <div className="sticky bottom-0 z-sticky bg-surface/90 py-2 backdrop-blur">
            <SectionSaveBar
              dirty={dirty > 0}
              saving={saving}
              error={error}
              onSave={() => void save()}
              onCancel={cancel}
              canEdit={canEditHere}
              saveLabel={dirty === 1 ? 'Save 1 change' : `Save ${dirty} changes`}
            />
          </div>
        ) : null}
      </div>
    </PageBody>
  );
}
