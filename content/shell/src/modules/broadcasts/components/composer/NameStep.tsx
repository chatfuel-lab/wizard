import { useEffect, useRef, useState } from 'react';
import { Input, SegmentedControl, type SegmentOption } from '~ui';
import type { CampaignRecord } from '../../lib/campaign';
import { UNNAMED } from '../../lib/composerSteps';
import { errorMessage } from '../../lib/errors';
import { StepFrame } from './StepFrame';

/** The three answers to "when": now, one later time, or on a repeat. The last two are the same pair. */
export type KindChoice = 'now' | 'later' | 'recurring';

const KIND_OPTIONS: readonly SegmentOption<KindChoice>[] = [
  { value: 'now', label: 'Send now' },
  { value: 'later', label: 'Later' },
  { value: 'recurring', label: 'Repeating' },
];

export interface NameStepProps {
  record: CampaignRecord;
  canEdit: boolean;
  /** A kind switch is running — the pair is being rebuilt. */
  switching: boolean;
  /** The kind the person chose here, when it differs from what the draft is yet. */
  kind: KindChoice;
  onRename: (name: string) => Promise<void>;
  onKind: (kind: KindChoice) => void;
}

/**
 * The first step: what the campaign is called, and when it goes. The name
 * saves on blur; the placeholder name the workspace gave the draft is shown
 * as a placeholder rather than a value, so the box reads empty until the
 * person names it. The kind switches the entry point (`kindSwitch.ts`);
 * "Later" and "Repeating" are one pair, and the schedule step tells them
 * apart.
 */
export function NameStep({ record, canEdit, switching, kind, onRename, onKind }: NameStepProps) {
  const stored = record.name === UNNAMED ? '' : record.name;
  const [draft, setDraft] = useState(stored);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const lastSaved = useRef(stored);

  useEffect(() => {
    if (stored !== lastSaved.current) {
      lastSaved.current = stored;
      setDraft(stored);
    }
  }, [stored]);

  const save = async () => {
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === lastSaved.current) return;
    setSaving(true);
    setFailure(null);
    try {
      await onRename(trimmed);
      lastSaved.current = trimmed;
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepFrame title="Name">
      <div className="max-w-xl space-y-5">
        <div>
          <label htmlFor="campaign-name" className="mb-1 block text-label font-medium text-text-muted">
            Campaign name
          </label>
          <Input
            id="campaign-name"
            value={draft}
            placeholder={UNNAMED}
            disabled={!canEdit || saving}
            invalid={failure !== null}
            maxLength={120}
            autoFocus={canEdit && stored === ''}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
            }}
          />
          {failure ? <p className="mt-1 text-meta text-danger">{failure}</p> : null}
        </div>
        <div>
          <span className="mb-1 block text-label font-medium text-text-muted">When</span>
          <SegmentedControl
            aria-label="When it goes"
            value={kind}
            options={KIND_OPTIONS.map((option) => ({ ...option, disabled: !canEdit || switching }))}
            onChange={onKind}
          />
        </div>
      </div>
    </StepFrame>
  );
}
