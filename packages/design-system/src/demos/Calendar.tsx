import { useMemo, useRef, useState } from 'react';
import {
  AgendaList,
  Avatar,
  Button,
  DatePickerPopover,
  DurationInput,
  EVENT_TONES,
  EventChip,
  IconCheck,
  IconWarning,
  Kbd,
  MiniCalendar,
  MonthGrid,
  ResourceHeader,
  SegmentedControl,
  Stepper,
  Switch,
  Tag,
  TimeGrid,
  TimeInput,
  TimezoneSelect,
  WeekHoursEditor,
  addMonths,
  assignTones,
  dayKeyOf,
  defaultWeekHours,
  formatMinuteOfDay,
  monthKeyOf,
  monthMatrix,
  shiftDayKey,
  startOfWeek,
  timeRangeLabel,
  validateWeekHours,
  weekDays,
  weekdayOf,
  type DayKey,
  type EventChipStatus,
  type EventTone,
  type GridDensity,
  type TimeGridEvent,
  type WeekHours,
  type Weekday,
} from '~ui';
import { Demo, Note, Row } from './shared';

/**
 * The proving ground for content/ui/src/calendar.
 *
 * Shaped like the real Bookings module rather than a toy: seven columns of a
 * working week with an overlap cluster, a ten-line event and a 15-minute
 * block; a resource day with breaks and a busy hatch; a month with drops; the
 * pickers the wizard and the panel are built from. Everything mutates local
 * state and logs what it did, so a drag can be checked against what the
 * module will receive.
 */

interface DemoEvent extends TimeGridEvent {
  title: string;
  who: string;
  status: EventChipStatus;
}

const TODAY = dayKeyOf(new Date());
const WEEK_START = startOfWeek(TODAY, 1);
const WEEK = weekDays(WEEK_START);
const NOW_MINUTE = new Date().getHours() * 60 + new Date().getMinutes();

const SPECIALISTS = ['Alex', 'Maria', 'Sam', 'Dana', 'Chris'];
const TONE_BY_NAME = assignTones(SPECIALISTS);

const WEEK_EVENTS: DemoEvent[] = [
  { id: 'e1', columnId: WEEK[0]!, start: 540, end: 570, title: 'Consultation', who: 'Ada Lovelace', status: 'default' },
  { id: 'e2', columnId: WEEK[0]!, start: 555, end: 615, title: 'Haircut', who: 'Grace Hopper', status: 'default' },
  { id: 'e3', columnId: WEEK[0]!, start: 600, end: 660, title: 'Massage', who: 'Alan Turing', status: 'tentative' },
  { id: 'e4', columnId: WEEK[1]!, start: 600, end: 615, title: 'Check-in', who: 'K. Johnson', status: 'default' },
  {
    id: 'e5',
    columnId: WEEK[1]!,
    start: 780,
    end: 1380,
    title: 'Deep session',
    who: 'Margaret Hamilton',
    status: 'default',
  },
  { id: 'e6', columnId: WEEK[2]!, start: 660, end: 720, title: 'Consultation', who: 'Barbara Liskov', status: 'muted' },
  { id: 'e7', columnId: WEEK[3]!, start: 420, end: 480, title: 'Early bird', who: 'Radia Perlman', status: 'default' },
  { id: 'e8', columnId: WEEK[3]!, start: 900, end: 990, title: 'Massage', who: 'Ada Lovelace', status: 'default' },
  {
    id: 'e9',
    columnId: WEEK[4]!,
    start: 1260,
    end: 1320,
    title: 'Late slot',
    who: 'Grace Hopper',
    status: 'tentative',
  },
  { id: 'e10', columnId: WEEK[5]!, start: 600, end: 690, title: 'Saturday', who: 'Alan Turing', status: 'default' },
];

const WHO_TONE = new Map<string, EventTone>();
for (const event of WEEK_EVENTS)
  if (!WHO_TONE.has(event.who)) WHO_TONE.set(event.who, ((WHO_TONE.size % 8) + 1) as EventTone);

const DENSITIES: { value: GridDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'comfortable', label: 'Comfortable' },
];

/* hourLabelStep, in minutes. 60 is the default ruler; a coarser step is what a
   grid whose blocks print their own time asks for. Strings, because that is
   what a segmented control switches between. */
const LABEL_STEPS = [
  { value: '60', label: 'Every hour' },
  { value: '180', label: 'Every 3 hours' },
];

function dayHeader(dayKey: DayKey, today: boolean) {
  const date = new Date(`${dayKey}T12:00:00`);
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-micro uppercase text-text-muted">
        {date.toLocaleDateString(undefined, { weekday: 'short' })}
      </span>
      <span
        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-label tabular-nums ${
          today ? 'bg-accent font-semibold text-accent-fg' : 'font-medium'
        }`}
      >
        {date.getDate()}
      </span>
    </span>
  );
}

function WeekGridDemo() {
  const [events, setEvents] = useState<DemoEvent[]>(WEEK_EVENTS);
  const [density, setDensity] = useState<GridDensity>('cozy');
  const [hourLabelStep, setHourLabelStep] = useState('60');
  const [hour12, setHour12] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const nextId = useRef(100);
  const push = (line: string) => setLog((prev) => [line, ...prev].slice(0, 5));
  const label = (start: number, end: number) => timeRangeLabel(start, end, { hour12 });

  const columns = useMemo(
    () =>
      WEEK.map((dayKey) => ({
        id: dayKey,
        header: dayHeader(dayKey, dayKey === TODAY),
        label: dayKey,
        disabled: weekdayOf(dayKey) === 0,
      })),
    [],
  );

  return (
    <Demo
      name="TimeGrid — week"
      tokens="event-1…8 (+soft/fg) · now · off-hours · time-grid-rules · h-hour-{compact,cozy,comfortable} · w-time-gutter · w-time-column · hourLabelStep"
    >
      <Note>
        Seven columns, 24 hours, one scroll container with a sticky header and gutter. Drag a block to move it
        (15-minute snap, columns change), drag its top or bottom edge to resize, drag on empty grid to create — in
        either direction from where you pressed. Touch needs a 180 ms hold, so the grid still scrolls with a swipe.
        Focus a block and press <Kbd keys={['space']} /> to grab it with the keyboard; the live region narrates. Sunday
        is a disabled column. Business hours are 09:00–18:00 weekdays, 10:00–14:00 Saturday. <code>hourLabelStep</code>{' '}
        thins the gutter&rsquo;s labels out and leaves the hour rules where they are.
      </Note>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SegmentedControl value={density} onChange={setDensity} options={DENSITIES} size="sm" aria-label="Density" />
        <SegmentedControl
          value={hourLabelStep}
          onChange={setHourLabelStep}
          options={LABEL_STEPS}
          size="sm"
          aria-label="Hour labels"
        />
        <Switch checked={hour12} onChange={setHour12} label="12-hour clock" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEvents(WEEK_EVENTS);
            setLog([]);
            setSelected(null);
          }}
        >
          Reset
        </Button>
      </div>
      <div className="h-[520px]">
        <TimeGrid<DemoEvent>
          columns={columns}
          events={events}
          density={density}
          hourLabelStep={Number(hourLabelStep)}
          hour12={hour12}
          selectedId={selected}
          now={{ minute: NOW_MINUTE, columnId: TODAY }}
          initialScrollMinute={480}
          businessHours={(dayKey) => {
            const weekday = weekdayOf(dayKey);
            if (weekday === 0) return null;
            if (weekday === 6) return [{ start: 600, end: 840 }];
            return [{ start: 540, end: 1080 }];
          }}
          eventLabel={(event) => `${event.title}, ${event.who}, ${label(event.start, event.end)}`}
          renderEvent={(event, ctx) => (
            <EventChip
              tone={WHO_TONE.get(event.who) ?? 'neutral'}
              status={event.status}
              title={event.who}
              subtitle={event.title}
              meta={label(event.start, event.end)}
              heightPx={ctx.heightPx}
              selected={ctx.selected}
              trailing={event.status === 'muted' ? <IconWarning size={12} /> : undefined}
            />
          )}
          onEventClick={(event) => {
            setSelected((prev) => (prev === event.id ? null : event.id));
            push(`Clicked ${event.who}`);
          }}
          onSlotClick={(columnId, minute) => push(`Slot ${columnId} ${formatMinuteOfDay(minute, { hour12 })}`)}
          onEventMove={(change) => {
            setEvents((prev) => prev.map((event) => (event.id === change.id ? { ...event, ...change } : event)));
            push(`Moved ${change.id} → ${change.columnId} ${label(change.start, change.end)}`);
          }}
          onEventResize={(change) => {
            setEvents((prev) => prev.map((event) => (event.id === change.id ? { ...event, ...change } : event)));
            push(`Resized ${change.id} → ${label(change.start, change.end)}`);
          }}
          onCreate={(create) => {
            const id = `new-${nextId.current++}`;
            setEvents((prev) => [
              ...prev,
              { id, ...create, title: 'New booking', who: 'Walk-in', status: 'tentative' },
            ]);
            push(`Created ${create.columnId} ${label(create.start, create.end)}`);
          }}
          canDrag={(event) => event.status !== 'muted'}
          aria-label="Week of bookings"
          className="h-full"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-micro text-text-faint">Log</span>
        {log.map((entry, index) => (
          <Tag key={`${entry}-${index}`} tone={index === 0 ? 'accent' : 'neutral'}>
            {entry}
          </Tag>
        ))}
      </div>
    </Demo>
  );
}

interface ResourceEvent extends TimeGridEvent {
  who: string;
}

function ResourceDayDemo() {
  const [events, setEvents] = useState<ResourceEvent[]>(() =>
    SPECIALISTS.flatMap((name, index) => [
      { id: `${name}-1`, columnId: name, start: 540 + index * 30, end: 600 + index * 30, who: 'Ada Lovelace' },
      { id: `${name}-2`, columnId: name, start: 900, end: 945 + index * 15, who: 'Grace Hopper' },
    ]),
  );
  const [log, setLog] = useState<string[]>([]);
  const columns = useMemo(
    () =>
      SPECIALISTS.map((name, index) => ({
        id: name,
        label: name,
        header: (
          <ResourceHeader
            name={name}
            tone={TONE_BY_NAME.get(name)}
            meta={index === 2 ? 'No schedule' : index === 3 ? 'Mon/Wed/Fri 8–14' : 'Mon–Fri 9–18'}
          />
        ),
        disabled: index === 2,
      })),
    [],
  );
  return (
    <Demo name="TimeGrid — resource day" tokens="busy/busy-soft (hatch-busy) · blocked (hatch-blocked) · lockColumn">
      <Note>
        Five specialists side by side. Breaks are the dark hatch (blocked), a synced calendar's appointment is the light
        hatch (busy), Sam has no schedule and is closed. <b>lockColumn</b> is on: a move keeps its specialist and only
        changes the time — the day-by-time view where a column change means nothing. The now-line spans every column
        here.
      </Note>
      <div className="h-[420px]">
        <TimeGrid<ResourceEvent>
          columns={columns}
          events={events}
          range={{ start: 420, end: 1200 }}
          density="cozy"
          lockColumn
          now={{ minute: NOW_MINUTE }}
          initialScrollMinute={480}
          businessHours={(name) => (name === 'Dana' ? [{ start: 480, end: 840 }] : [{ start: 540, end: 1080 }])}
          blockedPeriods={SPECIALISTS.filter((_, i) => i !== 2 && i !== 3).map((name) => ({
            columnId: name,
            start: 780,
            end: 840,
          }))}
          busyPeriods={[
            { columnId: 'Alex', start: 660, end: 720 },
            { columnId: 'Maria', start: 990, end: 1050 },
          ]}
          renderEvent={(event, ctx) => (
            <EventChip
              tone={TONE_BY_NAME.get(event.columnId) ?? 'neutral'}
              title={event.who}
              meta={timeRangeLabel(event.start, event.end)}
              heightPx={ctx.heightPx}
              selected={ctx.selected}
            />
          )}
          onEventMove={(change) => {
            setEvents((prev) => prev.map((event) => (event.id === change.id ? { ...event, ...change } : event)));
            setLog((prev) => [`${change.id} → ${timeRangeLabel(change.start, change.end)}`, ...prev].slice(0, 4));
          }}
          onEventResize={(change) => {
            setEvents((prev) => prev.map((event) => (event.id === change.id ? { ...event, ...change } : event)));
            setLog((prev) =>
              [`${change.id} resized → ${timeRangeLabel(change.start, change.end)}`, ...prev].slice(0, 4),
            );
          }}
          onCreate={(create) => {
            setEvents((prev) => [...prev, { id: `r-${Date.now()}`, ...create, who: 'Walk-in' }]);
            setLog((prev) =>
              [`${create.columnId} new ${timeRangeLabel(create.start, create.end)}`, ...prev].slice(0, 4),
            );
          }}
          aria-label="Specialists today"
          className="h-full"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {log.map((entry, index) => (
          <Tag key={`${entry}-${index}`} tone={index === 0 ? 'accent' : 'neutral'}>
            {entry}
          </Tag>
        ))}
      </div>
    </Demo>
  );
}

interface MonthEvent {
  id: string;
  day: DayKey;
  title: string;
  minute: number;
  tone: EventTone;
}

function MonthDemo() {
  const [month, setMonth] = useState(monthKeyOf(TODAY));
  const [events, setEvents] = useState<MonthEvent[]>(() => {
    const days = monthMatrix(monthKeyOf(TODAY), 1);
    const out: MonthEvent[] = [];
    let n = 0;
    for (let i = 3; i < 40; i += 3) {
      const count = i % 9 === 0 ? 5 : (i % 2) + 1;
      for (let j = 0; j < count; j += 1) {
        n += 1;
        out.push({
          id: `m${n}`,
          day: days[i]!,
          title: ['Consultation', 'Haircut', 'Massage'][j % 3]!,
          minute: 540 + j * 60,
          tone: ((j % 8) + 1) as EventTone,
        });
      }
    }
    return out;
  });
  const [log, setLog] = useState<string[]>([]);
  return (
    <Demo name="MonthGrid" tokens="row-selected · accent-soft drop target · always 6×7">
      <Note>
        Drag a chip to another day (the discrete <code className="font-mono text-micro">useDragSession</code>, same as
        the board). "+N more" and a day click log. Arrow keys walk the days.
      </Note>
      <div className="mb-2 flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setMonth((m) => addMonths(m, -1))}>
          ‹ Previous
        </Button>
        <span className="text-label font-medium">{month}</span>
        <Button size="sm" variant="ghost" onClick={() => setMonth((m) => addMonths(m, 1))}>
          Next ›
        </Button>
      </div>
      <div className="h-[600px]">
        <MonthGrid<MonthEvent>
          month={month}
          events={events}
          dayOf={(event) => event.day}
          compare={(a, b) => a.minute - b.minute}
          todayKey={TODAY}
          renderEvent={(event) => (
            <EventChip
              variant="chip"
              tone={event.tone}
              title={event.title}
              meta={formatMinuteOfDay(event.minute, { short: true })}
            />
          )}
          onDayClick={(day) => setLog((prev) => [`Day ${day}`, ...prev].slice(0, 4))}
          onMoreClick={(day, hidden) => setLog((prev) => [`+${hidden.length} on ${day}`, ...prev].slice(0, 4))}
          onEventClick={(event) => setLog((prev) => [`Open ${event.title}`, ...prev].slice(0, 4))}
          onEventDrop={(event, day) => {
            setEvents((prev) => prev.map((each) => (each.id === event.id ? { ...each, day } : each)));
            setLog((prev) => [`${event.title} → ${day}`, ...prev].slice(0, 4));
          }}
          aria-label="Month of bookings"
          className="h-full"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {log.map((entry, index) => (
          <Tag key={`${entry}-${index}`} tone={index === 0 ? 'accent' : 'neutral'}>
            {entry}
          </Tag>
        ))}
      </div>
    </Demo>
  );
}

function PickersDemo() {
  const [month, setMonth] = useState(monthKeyOf(TODAY));
  const [day, setDay] = useState<DayKey | null>(TODAY);
  const [weekStartsOn, setWeekStartsOn] = useState<Weekday>(1);
  const [popoverDay, setPopoverDay] = useState<DayKey | null>(null);
  const [time, setTime] = useState<string | null>('09:30');
  const [duration, setDuration] = useState<number | null>(45);
  const [zone, setZone] = useState<string | null>('Europe/Berlin');
  const [hour12, setHour12] = useState(false);

  const markers = (key: DayKey) => {
    const weekday = weekdayOf(key);
    if (weekday === 0) return 'none' as const;
    return Number(key.slice(8)) % 5 === 0 ? ('busy' as const) : ('available' as const);
  };

  return (
    <Demo
      name="MiniCalendar · DatePickerPopover · TimeInput · DurationInput · TimezoneSelect"
      tokens="available (marker) · busy (marker) · accent selected day"
    >
      <Note>
        The calendar is controlled: the parent owns the month so it can fetch that month's availability, and the dots
        come from <code className="font-mono text-micro">markers(dayKey)</code>. Sundays are disabled. Keyboard: arrows,
        PageUp/PageDown across months, Enter selects. Time accepts what people type —{' '}
        <code className="font-mono text-micro">930</code>, <code className="font-mono text-micro">9:30p</code>,{' '}
        <code className="font-mono text-micro">2130</code> — and shows it back in the locale.
      </Note>
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-2">
          <MiniCalendar
            month={month}
            onMonthChange={setMonth}
            value={day}
            onChange={setDay}
            weekStartsOn={weekStartsOn}
            todayKey={TODAY}
            min={shiftDayKey(TODAY, -60)}
            isDisabled={(key) => weekdayOf(key) === 0}
            markers={markers}
            aria-label="Pick a day"
          />
          <SegmentedControl
            size="sm"
            value={String(weekStartsOn)}
            onChange={(v) => setWeekStartsOn(Number(v) as Weekday)}
            options={[
              { value: '1', label: 'Mon first' },
              { value: '0', label: 'Sun first' },
              { value: '6', label: 'Sat first' },
            ]}
            aria-label="Week starts on"
          />
          <p className="text-micro text-text-muted">Selected: {day ?? '—'}</p>
        </div>
        <div className="space-y-3">
          <Row label="Popover">
            <DatePickerPopover
              value={popoverDay}
              onChange={setPopoverDay}
              todayKey={TODAY}
              markers={markers}
              clearable
              aria-label="Booking date"
            />
          </Row>
          <Row label="Time">
            <TimeInput
              value={time}
              onChange={setTime}
              hour12={hour12}
              min="07:00"
              max="22:00"
              aria-label="Start time"
            />
            <Switch checked={hour12} onChange={setHour12} label="12-hour" />
            <span className="text-micro text-text-muted">→ {time ?? 'null'}</span>
          </Row>
          <Row label="Small">
            <TimeInput value={time} onChange={setTime} hour12={hour12} size="sm" aria-label="Start time, small" />
            <TimeInput value={null} onChange={() => {}} invalid aria-label="Invalid time" />
            <TimeInput value="10:00" onChange={() => {}} disabled aria-label="Disabled time" />
          </Row>
          <Row label="Duration">
            <DurationInput value={duration} onChange={setDuration} aria-label="Duration" />
            <span className="text-micro text-text-muted">→ {duration ?? 'null'} min</span>
          </Row>
          <Row label="Time zone">
            <div className="w-80">
              <TimezoneSelect value={zone} onChange={setZone} clearable aria-label="Bot time zone" />
            </div>
            <span className="text-micro text-text-muted">→ {zone ?? 'null'}</span>
          </Row>
        </div>
      </div>
    </Demo>
  );
}

function WeekHoursDemo() {
  const [value, setValue] = useState<WeekHours>(() => {
    const week = defaultWeekHours();
    week[1] = { ...week[1], break: { start: '13:00', end: '14:00' } };
    week[3] = { enabled: true, start: '10:00', end: '09:00', break: null }; // injected error
    return week;
  });
  const errors = useMemo(() => validateWeekHours(value), [value]);
  return (
    <Demo name="WeekHoursEditor" tokens="Switch · TimeInput ×2 · one break · copy menu · danger row error">
      <Note>
        One row per weekday, 1:1 with the API's schedule input: enabled, start, end, and exactly one break. Wednesday
        arrives with an end before its start so the row error is visible; the copy menu on a row copies the whole row to
        all days or to weekdays. Validation runs in the parent (
        <code className="font-mono text-micro">validateWeekHours</code>) and comes back as{' '}
        <code className="font-mono text-micro">errors</code>, so a server rejection lands on the same line.
      </Note>
      <div className="max-w-2xl">
        <WeekHoursEditor value={value} onChange={setValue} errors={errors} />
      </div>
    </Demo>
  );
}

interface AgendaItem {
  id: string;
  day: DayKey;
  start: number;
  end: number;
  who: string;
  service: string;
  tone: EventTone;
}

function AgendaDemo() {
  const items = useMemo<AgendaItem[]>(() => {
    const out: AgendaItem[] = [];
    let n = 0;
    for (let d = 0; d < 5; d += 1) {
      const count = d === 1 ? 6 : 2 + (d % 3);
      for (let i = 0; i < count; i += 1) {
        n += 1;
        out.push({
          id: `a${n}`,
          day: shiftDayKey(TODAY, d),
          start: 540 + i * 45,
          end: 585 + i * 45,
          who: ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson'][i % 4]!,
          service: ['Consultation', 'Haircut', 'Massage'][i % 3]!,
          tone: ((i % 8) + 1) as EventTone,
        });
      }
    }
    return out;
  }, []);
  const [narrow, setNarrow] = useState(false);
  return (
    <Demo name="AgendaList" tokens="sticky day headers · z-sticky · compact +N more">
      <Note>
        Day-grouped, sticky headers inside its own scroll box. Narrow the container and each day collapses to three rows
        plus "+N more", which expands in place — the width is the container's, not the window's.
      </Note>
      <div className="mb-2">
        <Switch checked={narrow} onChange={setNarrow} label="Narrow container (compact)" />
      </div>
      <div className={`h-80 rounded-card border border-border ${narrow ? 'w-80' : 'w-full'}`}>
        <AgendaList<AgendaItem>
          items={items}
          dayOf={(item) => item.day}
          keyOf={(item) => item.id}
          compare={(a, b) => a.start - b.start}
          todayKey={TODAY}
          compactMaxPerDay={3}
          onDayClick={() => {}}
          renderItem={(item) => (
            <div className="flex items-center gap-3 px-3 py-2 hover:bg-row-hover">
              <span className="w-32 shrink-0 whitespace-nowrap text-label tabular-nums text-text-muted">
                {timeRangeLabel(item.start, item.end)}
              </span>
              <Avatar name={item.who} size={24} />
              <span className="min-w-0 flex-1 truncate text-body">{item.who}</span>
              <EventChip variant="chip" tone={item.tone} title={item.service} className="w-32" />
            </div>
          )}
          aria-label="Upcoming bookings"
          className="h-full"
        />
      </div>
    </Demo>
  );
}

function StepperDemo() {
  const steps = [
    { id: 'service', label: 'Service', description: 'Haircut · 45 min' },
    { id: 'specialist', label: 'Specialist', description: 'Anyone' },
    { id: 'day', label: 'Day' },
    { id: 'time', label: 'Time' },
    { id: 'customer', label: 'Customer' },
    { id: 'confirm', label: 'Confirm' },
  ];
  const [current, setCurrent] = useState('day');
  return (
    <Demo name="Stepper" tokens="accent complete · danger error · aria-current=step">
      <Note>
        The wizard's progress. Completed steps are buttons when{' '}
        <code className="font-mono text-micro">onStepClick</code> is given — going back is through the stepper. Statuses
        derive from position unless a step says otherwise.
      </Note>
      <div className="space-y-6">
        <Stepper steps={steps} current={current} onStepClick={setCurrent} aria-label="New booking" />
        <div className="flex gap-8">
          <Stepper
            steps={steps.map((step) => (step.id === 'specialist' ? { ...step, status: 'error' as const } : step))}
            current={current}
            orientation="vertical"
            onStepClick={setCurrent}
            aria-label="New booking, vertical"
            className="w-56"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCurrent(steps[Math.max(0, steps.findIndex((s) => s.id === current) - 1)]!.id)}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={() =>
                setCurrent(steps[Math.min(steps.length - 1, steps.findIndex((s) => s.id === current) + 1)]!.id)
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Demo>
  );
}

const STATUSES: EventChipStatus[] = ['default', 'tentative', 'muted'];
const HEIGHTS = [20, 36, 64];

function EventChipMatrixDemo() {
  return (
    <Demo name="EventChip matrix" tokens="8 tones × block/chip × default/tentative/muted">
      <Note>
        Every tone in every status, at the three block heights the grid produces (one, two and three lines), plus the
        chip. Muted drops the tone: colour means who or what, never how it is going. Check this in dark mode — the softs
        are the same hue at 18 % lightness, the fgs the pastel that stays legible on it.
      </Note>
      <div className="space-y-4">
        {STATUSES.map((status) => (
          <div key={status}>
            <p className="mb-1.5 text-micro font-medium uppercase text-text-muted">{status}</p>
            <div className="grid grid-cols-8 gap-2">
              {EVENT_TONES.map((tone) => (
                <div key={tone} className="flex flex-col gap-1.5">
                  {HEIGHTS.map((height) => (
                    <div key={height} style={{ height }}>
                      <EventChip
                        tone={tone}
                        status={status}
                        title={`Tone ${tone}`}
                        subtitle="Ada Lovelace"
                        meta="9:00 – 9:45"
                        heightPx={height}
                        trailing={height === 64 && tone === 3 ? <IconCheck size={12} /> : undefined}
                      />
                    </div>
                  ))}
                  <EventChip variant="chip" tone={tone} status={status} title="Chip" meta="9:00" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div>
          <p className="mb-1.5 text-micro font-medium uppercase text-text-muted">selected · neutral</p>
          <div className="grid grid-cols-8 gap-2">
            <div style={{ height: 36 }}>
              <EventChip tone={2} title="Selected" meta="9:00 – 9:45" heightPx={36} selected />
            </div>
            <div style={{ height: 36 }}>
              <EventChip tone="neutral" title="Neutral" meta="9:00 – 9:45" heightPx={36} />
            </div>
            <EventChip variant="chip" tone={5} title="Selected chip" selected />
          </div>
        </div>
      </div>
    </Demo>
  );
}

export function CalendarSection() {
  return (
    <div className="space-y-4">
      <WeekGridDemo />
      <ResourceDayDemo />
      <MonthDemo />
      <PickersDemo />
      <WeekHoursDemo />
      <AgendaDemo />
      <StepperDemo />
      <EventChipMatrixDemo />
    </div>
  );
}
