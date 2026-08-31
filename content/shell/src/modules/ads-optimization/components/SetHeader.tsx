import { useEffect, useState } from 'react';
import { Button, IconTrash, Input, Switch, Tag } from '~ui';
import { MAX_SET_NAME } from '../lib/eventRules';
import { setName, summarize } from '../lib/summary';
import type { EventSetView } from '../types';

interface SetHeaderProps {
  set: EventSetView;
  busy: boolean;
  onRename: (name: string) => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}

/** Past this many the row would wrap; the rest are counted instead. */
const SHOWN_CONVERSIONS = 3;

/**
 * The set itself: its name, whether it runs, and the conversions it reports.
 *
 * The base set is named by us and cannot be renamed or deleted, so it renders a
 * heading where a custom set renders an input. The conversions are tags rather
 * than a sentence - they are the value, and a value belongs on the screen where
 * a description of the value would not.
 */
export function SetHeader({ set, busy, onRename, onToggle, onDelete }: SetHeaderProps) {
  const [name, setNameDraft] = useState(set.name ?? '');
  useEffect(() => setNameDraft(set.name ?? ''), [set.id, set.name]);

  const summary = summarize(set);
  const shown = summary.conversions.slice(0, SHOWN_CONVERSIONS);
  const rest = summary.conversions.length - shown.length;

  const commit = () => {
    const next = name.trim();
    if (!next || next === (set.name ?? '')) {
      setNameDraft(set.name ?? '');
      return;
    }
    onRename(next);
  };

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {set.isBase ? (
            <h2 className="truncate text-heading font-semibold text-text">{setName(set)}</h2>
          ) : (
            <Input
              value={name}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setNameDraft(set.name ?? '');
              }}
              maxLength={MAX_SET_NAME}
              disabled={busy}
              aria-label="Set name"
            />
          )}
        </div>
        <Switch checked={set.enabled} onChange={onToggle} disabled={busy} label={set.enabled ? 'On' : 'Off'} />
        {set.isBase ? null : (
          <Button
            variant="dangerGhost"
            size="sm"
            iconOnly
            aria-label="Delete this event set"
            onClick={onDelete}
            disabled={busy}
          >
            <IconTrash size={14} />
          </Button>
        )}
      </div>

      {shown.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {shown.map((conversion) => (
            <Tag key={conversion} tone="accent">
              {conversion}
            </Tag>
          ))}
          {rest > 0 ? <Tag tone="neutral">{`+${rest}`}</Tag> : null}
        </div>
      ) : null}
    </header>
  );
}
