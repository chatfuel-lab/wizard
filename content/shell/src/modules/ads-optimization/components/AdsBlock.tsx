import { useEffect, useMemo, useState } from 'react';
import { Button, Card, IconClose, IconExternal, IconPlus, Input, Tag } from '~ui';
import { adIdProblem, adsManagerUrl, parseAdIds } from '../lib/adIds';
import type { Coverage } from '../lib/coverage';
import { rivalsOf } from '../lib/coverage';
import { MAX_ADS } from '../lib/eventRules';
import { setName } from '../lib/summary';
import type { AutomationRef, EventSetView } from '../types';
import { InheritLine } from './InheritLine';

interface AdsBlockProps {
  set: EventSetView;
  sets: readonly EventSetView[];
  coverage: Coverage;
  busy: boolean;
  onSave: (adIDs: string[]) => void;
  onRevert: (parentId: string) => void;
  onOpenSet: (setId: string) => void;
}

const PROBLEM_LABEL: Record<string, string> = {
  blank: 'Empty',
  tooLong: 'Too long',
  notAnId: 'Not an ad ID',
};

/**
 * The ads a set claims.
 *
 * Ids are typed, not picked: the API stores whatever string it is given and
 * checks nothing against Meta, and there is no query that turns an id back into
 * an ad. So the box takes what people actually have - the ads manager address
 * out of the browser bar - and a chip says what is wrong with an id rather than
 * pretending to know that it is right.
 */
export function AdsBlock({ set, sets, coverage, busy, onSave, onRevert, onOpenSet }: AdsBlockProps) {
  const stored = set.ads?.value ?? [];
  const [draft, setDraft] = useState<string[]>([...stored]);
  const [entry, setEntry] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);

  /* A change from anywhere else - the subscription, an undo - replaces the
     draft. Keyed on the value and the set, so switching sets resets too. */
  const storedKey = JSON.stringify(stored);
  useEffect(() => {
    setDraft(JSON.parse(storedKey) as string[]);
  }, [storedKey, set.id]);

  const dirty = JSON.stringify(draft) !== storedKey;
  const full = draft.length >= MAX_ADS;
  const namesById = useMemo(() => new Map(sets.map((candidate) => [candidate.id, setName(candidate)])), [sets]);

  const add = () => {
    const found = parseAdIds(entry);
    if (found.length === 0) {
      setEntryError('No ad ID in that.');
      return;
    }
    const room = Math.max(0, MAX_ADS - draft.length);
    const fresh = found.filter((id) => !draft.includes(id)).slice(0, room);
    setDraft([...draft, ...fresh]);
    setEntry('');
    setEntryError(fresh.length < found.length && room === 0 ? `Only ${MAX_ADS} ads fit in one set.` : null);
  };

  const remove = (id: string) => setDraft(draft.filter((candidate) => candidate !== id));

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-label font-medium text-text">Ads</h3>
          <span className="text-meta tabular-nums text-text-faint">
            {draft.length} / {MAX_ADS}
          </span>
        </div>

        <InheritLine
          inheritsFrom={(set.ads?.inheritsFrom as AutomationRef | null) ?? null}
          canInheritFrom={set.ads?.canInheritFrom ?? []}
          onOpen={onOpenSet}
          onRevert={onRevert}
          disabled={busy}
        />

        {draft.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {draft.map((adId) => {
              const problem = adIdProblem(adId);
              const rivals = rivalsOf(coverage, set.id, adId);
              const rival = rivals[0];
              return (
                <li
                  key={adId}
                  className="flex items-center gap-1.5 rounded-control border border-border bg-surface-sunken py-1 pl-2 pr-1"
                >
                  <span className="max-w-64 truncate font-mono text-meta text-text">{adId.trim() || 'Empty'}</span>
                  {problem ? <Tag tone="danger">{PROBLEM_LABEL[problem] ?? 'Invalid'}</Tag> : null}
                  {rival ? <Tag tone="warning">Also in {namesById.get(rival) ?? 'another set'}</Tag> : null}
                  {problem ? null : (
                    <a
                      href={adsManagerUrl(adId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-visible:focus-ring rounded-control p-1 text-text-faint hover:text-text"
                      aria-label={`Open ad ${adId} in Meta Ads Manager`}
                    >
                      <IconExternal size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(adId)}
                    aria-label={`Remove ad ${adId}`}
                    className="focus-visible:focus-ring rounded-control p-1 text-text-faint hover:text-text"
                  >
                    <IconClose size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              value={entry}
              onChange={(event) => {
                setEntry(event.target.value);
                setEntryError(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                add();
              }}
              placeholder="Ad ID, or the Ads Manager link"
              invalid={Boolean(entryError)}
              disabled={full}
              aria-label="Add an ad"
            />
            {entryError ? <p className="mt-1 text-meta text-danger">{entryError}</p> : null}
          </div>
          <Button variant="secondary" onClick={add} disabled={full || entry.trim() === ''}>
            <IconPlus size={14} />
            Add
          </Button>
        </div>

        {dirty ? (
          <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
            <Button variant="ghost" onClick={() => setDraft(JSON.parse(storedKey) as string[])} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={() => onSave(draft)}>
              Save ads
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
