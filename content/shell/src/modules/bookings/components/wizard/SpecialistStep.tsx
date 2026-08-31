import { Avatar, IconCheck, IconUsers, Tag } from '~ui';
import { hasSchedule, specialistName } from '../../lib/catalogStore';
import { scheduleSummary } from '../../lib/schedule';
import type { SpecialistChoice } from '../../lib/wizardStore';
import type { SpecialistRecord } from '../../types';

export interface SpecialistStepProps {
  /** Those offering the chosen service — or everyone, when no service was picked. */
  specialists: readonly SpecialistRecord[];
  /** Named in the "Anyone" description. */
  serviceTitle: string | null;
  choice: SpecialistChoice;
  onChoose: (choice: Exclude<SpecialistChoice, { kind: 'unset' }>) => void;
  weekStartsOn: number;
}

/**
 * Step 2: who. "Anyone" first — it means "whoever is free at the slot I
 * pick", which the time step resolves per slot — then each specialist offering
 * the service with their hours summary; a specialist with no working hours
 * wears a badge, because availability will have nothing to offer for them
 * (the time step says so and links to Staff). A click chooses and advances.
 */
export function SpecialistStep({ specialists, serviceTitle, choice, onChoose, weekStartsOn }: SpecialistStepProps) {
  const anyone = choice.kind === 'anyone';
  return (
    <div role="radiogroup" aria-label="Specialist" className="grid gap-2 @compact:grid-cols-2">
      <button
        type="button"
        role="radio"
        aria-checked={anyone}
        onClick={() => onChoose({ kind: 'anyone' })}
        className={`flex items-center gap-3 rounded-card border p-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${
          anyone ? 'border-accent bg-accent-soft' : 'border-border bg-surface-raised'
        }`}
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-muted"
        >
          <IconUsers size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">Anyone</span>
            {anyone ? <IconCheck size={14} className="shrink-0 text-accent" /> : null}
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            {specialists.length === 0
              ? 'No specialist offers this yet — the booking stays unassigned.'
              : `Whoever is free${serviceTitle ? ` for ${serviceTitle}` : ''} — ${specialists.length} ${specialists.length === 1 ? 'specialist' : 'specialists'}.`}
          </span>
        </span>
      </button>

      {specialists.map((sp) => {
        const selected = choice.kind === 'one' && choice.id === sp.id;
        const name = specialistName(sp.profile);
        const scheduled = hasSchedule(sp);
        return (
          <button
            key={sp.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChoose({ kind: 'one', id: sp.id })}
            className={`flex items-center gap-3 rounded-card border p-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${
              selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface-raised'
            }`}
          >
            <Avatar src={sp.profile.logo?.url ?? undefined} name={name} size={36} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-text">{name}</span>
                {scheduled ? null : <Tag tone="warning">No working hours</Tag>}
                {selected ? <IconCheck size={14} className="shrink-0 text-accent" /> : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-text-muted">
                {scheduleSummary(sp.schedule, weekStartsOn)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
