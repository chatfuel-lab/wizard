import { useEffect, useState } from 'react';
import { Alert, Button, Card, IconExternal, Skeleton } from '~ui';
import { BookingAiAutonomyDocument, FuelySettingBookingRulesAutonomyLevel } from '~api/generated/bookings/graphql';
import { useBookings } from '../../BookingsContext';
import { errorMessage } from '../../lib/errors';
import { SettingsRow } from './SettingsRow';

/** Least to most autonomous — the per-scope automation values (the ones the AI obeys). */
export const AUTONOMY_LABELS: Record<FuelySettingBookingRulesAutonomyLevel, { label: string; description: string }> = {
  [FuelySettingBookingRulesAutonomyLevel.CollectIntents]: {
    label: 'Collect intent',
    description: 'The AI collects what the customer wants; a human books it.',
  },
  [FuelySettingBookingRulesAutonomyLevel.BookWithTeammatesApproval]: {
    label: 'Propose, a teammate approves',
    description: 'The AI proposes a slot; a teammate approves before it is booked.',
  },
  [FuelySettingBookingRulesAutonomyLevel.BookWithTeammatesReview]: {
    label: 'Book, a teammate reviews',
    description: 'The AI books; a teammate reviews it afterwards.',
  },
  [FuelySettingBookingRulesAutonomyLevel.BookWithFullAutonomy]: {
    label: 'Full autonomy',
    description: 'The AI books on its own.',
  },
  [FuelySettingBookingRulesAutonomyLevel.DontBook]: {
    label: "Don't book",
    description: 'The AI answers questions but never books.',
  },
};

/** Where the setting is edited: the Default rules of the AI Automations module. */
export const AUTONOMY_LINK = '/automations?setting=bookingRules';

export interface AutonomySectionProps {
  readOnly: boolean;
}

/**
 * How far the AI goes on its own when a customer asks to book — READ here,
 * changed in AI Automations. Since the bot moved to the per-scope automation
 * model the legacy `fuelyConfigBookingSetAIAutonomyLevel` is deprecated and
 * always answers `BotMigratedToNewFuelySettings`; the
 * value the AI obeys is the Default (All-scope) automation's Booking rules,
 * and any source may override it there. One home for one setting.
 */
export function AutonomySection({ readOnly }: AutonomySectionProps) {
  const { client, botId } = useBookings();
  const [level, setLevel] = useState<FuelySettingBookingRulesAutonomyLevel | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLevel(undefined);
    client
      .query(BookingAiAutonomyDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        const base = data.bot?.fuelyAutomations.find((a) => a.isBase) ?? null;
        const rules = base?.settings.find((s) => s.__typename === 'FuelySettingBookingRules');
        setLevel(rules && rules.__typename === 'FuelySettingBookingRules' ? rules.autonomyLevel : null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setLevel(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, generation]);

  const current = level ? AUTONOMY_LABELS[level] : null;

  return (
    <Card
      title="AI autonomy"
      description="What the AI may do by itself when a customer wants an appointment. Set in AI Automations — the Default rules, or per source."
    >
      {error ? (
        <Alert
          tone="danger"
          title="Could not read the AI's booking rules"
          action={
            <Button size="sm" variant="secondary" onClick={() => setGeneration((g) => g + 1)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      <SettingsRow label="Level" saving={false} stacked>
        {level === undefined ? (
          <Skeleton variant="block" height="2.5rem" />
        ) : (
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-medium text-text">{current?.label ?? 'Not set'}</p>
              {current ? <p className="text-xs text-text-muted">{current.description}</p> : null}
            </div>
            <a
              href={AUTONOMY_LINK}
              className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline focus-visible:focus-ring"
              aria-disabled={readOnly || undefined}
            >
              {readOnly ? 'See in AI Automations' : 'Change in AI Automations'}
              <IconExternal size={14} />
            </a>
          </div>
        )}
      </SettingsRow>
    </Card>
  );
}
