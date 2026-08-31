import { useMemo, useState } from 'react';
import {
  Button,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
  IconLayoutList,
  MiniCalendar,
  Popover,
  SegmentedControl,
  Toolbar,
  monthKeyOf,
  type Band,
  type DayKey,
  type MonthKey,
  type Weekday,
} from '~ui';
import type { CalendarMode } from '../lib/publishingParams';

export interface CalendarToolbarProps {
  band: Band;
  /** What the address asks for — the control shows this, not the fallback. */
  requestedMode: CalendarMode;
  /** What is actually on screen; the list has nothing to step through. */
  mode: CalendarMode;
  onMode: (mode: CalendarMode) => void;
  /** The period on screen, already formatted. */
  label: string;
  month: MonthKey;
  anchor: DayKey;
  todayKey: DayKey;
  weekStartsOn: Weekday;
  /** Days that hold at least one post — the picker dots them. */
  filledDays: ReadonlySet<DayKey>;
  onStep: (delta: -1 | 1) => void;
  onToday: () => void;
  onPickDay: (day: DayKey) => void;
}

const MODE_OPTIONS = [
  { value: 'month' as const, label: 'Month', icon: <IconCalendar /> },
  { value: 'week' as const, label: 'Week', icon: <IconColumns /> },
  { value: 'list' as const, label: 'List', icon: <IconLayoutList /> },
];

/**
 * The calendar's own control row: where in time we are, and which shape it is
 * drawn in.
 *
 * One left-aligned run, in the order the questions are asked: step back, step
 * forward, where am I, take me home, and only then what shape. The right of the
 * row is left empty rather than filled — a toolbar that pushes its last control
 * to the far edge makes two groups out of what is one thought.
 *
 * The period navigation is absent in the list, which runs from the first post
 * to the last and has nothing to page. The mode control shows what the address
 * ASKS for rather than what is rendered, so a narrow container that falls back
 * to the list still shows Month selected — the choice survives the resize, and
 * widening the container brings the month back.
 */
export function CalendarToolbar({
  band,
  requestedMode,
  mode,
  onMode,
  label,
  month,
  anchor,
  todayKey,
  weekStartsOn,
  filledDays,
  onStep,
  onToday,
  onPickDay,
}: CalendarToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<MonthKey>(month);
  const steps = mode !== 'list';
  const stepLabel = useMemo(() => (mode === 'week' ? 'week' : 'month'), [mode]);

  return (
    <Toolbar>
      {steps ? (
        <>
          <span className="flex items-center">
            <Button variant="ghost" size="sm" iconOnly aria-label={`Previous ${stepLabel}`} onClick={() => onStep(-1)}>
              <IconChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Next ${stepLabel}`} onClick={() => onStep(1)}>
              <IconChevronRight />
            </Button>
          </span>
          <Popover
            open={pickerOpen}
            onOpenChange={(open) => {
              setPickerOpen(open);
              if (open) setPickerMonth(monthKeyOf(anchor) || month);
            }}
            placement="bottom-start"
            aria-label="Jump to a date"
            className="p-2"
            trigger={(triggerProps) => (
              <Button {...triggerProps} variant="ghost" size="sm" className="font-semibold text-text">
                {label}
              </Button>
            )}
          >
            <MiniCalendar
              month={pickerMonth}
              onMonthChange={setPickerMonth}
              value={anchor}
              onChange={(day) => {
                setPickerOpen(false);
                onPickDay(day);
              }}
              weekStartsOn={weekStartsOn}
              markers={(day) => (filledDays.has(day) ? 'busy' : 'none')}
              todayKey={todayKey}
              aria-label="Jump to a date"
            />
          </Popover>
          {/* `data-publishing-today` is the contract the palette's Today
              reaches this button through: the day a week is drawn around is the
              calendar's own state, so nothing above it can go home. */}
          <Button variant="outline" size="sm" onClick={onToday} data-publishing-today>
            Today
          </Button>
        </>
      ) : null}
      <SegmentedControl
        aria-label="Calendar layout"
        value={requestedMode}
        onChange={onMode}
        options={MODE_OPTIONS}
        iconOnly={band === 'compact'}
        size="sm"
      />
    </Toolbar>
  );
}
