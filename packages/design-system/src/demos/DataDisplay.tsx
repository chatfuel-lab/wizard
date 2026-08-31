import { useState } from 'react';
import {
  Avatar,
  Breadcrumbs,
  Button,
  Collapsible,
  ContextMenu,
  DataTable,
  EmptyState,
  IconContacts,
  IconLock,
  MenuButton,
  Pagination,
  SegmentedControl,
  StackedMeter,
  StatTile,
  Tabs,
  Tag,
  type ContextMenuPoint,
  type DataTableColumn,
  type DataTableDensity,
  type SortState,
} from '~ui';
import { Demo, Note, Row } from './shared';

interface Deal {
  id: string;
  name: string;
  company: string;
  stage: 'New' | 'Ready' | 'Won' | 'Lost';
  amount: number;
  restricted?: boolean;
}

const DEALS: Deal[] = [
  { id: '1', name: 'Ada Lovelace', company: 'Analytical Engines', stage: 'Ready', amount: 12400 },
  { id: '2', name: 'Grace Hopper', company: 'Naval Systems', stage: 'Won', amount: 3200 },
  { id: '3', name: 'Alan Turing', company: 'Bletchley', stage: 'New', amount: 8900 },
  { id: '4', name: 'Katherine Johnson', company: 'Flight Research', stage: 'Ready', amount: 21000 },
  { id: '5', name: 'Restricted contact', company: '—', stage: 'New', amount: 0, restricted: true },
  { id: '6', name: 'Margaret Hamilton', company: 'Apollo Guidance', stage: 'Won', amount: 6750 },
  { id: '7', name: 'Barbara Liskov', company: 'Substitution Ltd', stage: 'Lost', amount: 44100 },
];

const STAGE_TONE = { New: 'neutral', Ready: 'accent', Won: 'success', Lost: 'danger' } as const;

const money = (value: number) =>
  value === 0 ? '—' : `€${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function DataDisplaySection() {
  const [tab, setTab] = useState('overview');
  const [sort, setSort] = useState<SortState | null>({ key: 'amount', dir: 'desc' });
  const [selected, setSelected] = useState<string[]>([]);
  const [density, setDensity] = useState<DataTableDensity>('cozy');
  const [menu, setMenu] = useState<ContextMenuPoint | null>(null);
  const [menuRow, setMenuRow] = useState<string | null>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [page, setPage] = useState(4);
  const [open, setOpen] = useState(true);

  const rows = [...DEALS].sort((a, b) => {
    if (!sort) return 0;
    const direction = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'amount') return (a.amount - b.amount) * direction;
    const left = String(a[sort.key as keyof Deal] ?? '');
    const right = String(b[sort.key as keyof Deal] ?? '');
    return left.localeCompare(right) * direction;
  });

  return (
    <div className="space-y-4">
      <Demo name="DataTable" tokens="sticky header · row-selected · h-row-{compact,cozy,comfortable} · colgroup resize">
        <Note>
          Fully controlled, deliberately: rows here are server-paged and merged from subscriptions, so any sort or
          selection the table held internally would be overwritten on every live echo. Drag a header edge to resize,
          shift-click a checkbox to take a range, and note that the restricted row can be neither selected nor opened.
          With <code className="font-mono text-micro">rowNavigation</code> the body is one Tab stop: arrows move, Enter
          opens, Space selects. Right-click a row — one shared ContextMenu in controlled mode, not one mounted per row.
        </Note>
        <Row label="density">
          <SegmentedControl
            aria-label="Density"
            size="sm"
            value={density}
            onChange={setDensity}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'cozy', label: 'Cozy' },
              { value: 'comfortable', label: 'Comfortable' },
            ]}
          />
          <span className="text-xs tabular-nums text-text-muted">{selected.length} selected</span>
        </Row>

        <div className="mt-3 max-h-72 overflow-auto rounded-card border border-border">
          <DataTable<Deal>
            stickyHeader
            pinFirstColumn
            density={density}
            caption="Demo deals"
            sort={sort}
            onSortChange={setSort}
            selectedIds={selected}
            onSelectionChange={setSelected}
            columnWidths={widths}
            onColumnWidthsChange={setWidths}
            isRowDisabled={(deal) => deal.restricted === true}
            rowNavigation
            onRowContextMenu={(deal, event) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY });
              setMenuRow(deal.name);
            }}
            onRowClick={() => {}}
            rowActions={() => (
              <MenuButton
                label="Row actions"
                items={[
                  { id: 'open', label: 'Open', onSelect: () => {} },
                  { id: 'copy', label: 'Copy link', onSelect: () => {} },
                ]}
              />
            )}
            columns={[
              {
                key: 'name',
                header: 'Deal',
                width: '15rem',
                minWidth: 140,
                sortable: true,
                resizable: true,
                render: (deal) =>
                  deal.restricted ? (
                    <span className="flex items-center gap-2 text-text-faint">
                      <IconLock size={14} />
                      {deal.name}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Avatar name={deal.name} size={22} />
                      <span className="truncate font-medium text-text">{deal.name}</span>
                    </span>
                  ),
              },
              { key: 'company', header: 'Company', width: '12rem', sortable: true, resizable: true },
              {
                key: 'stage',
                header: 'Stage',
                width: '7rem',
                sortable: true,
                render: (deal) => <Tag tone={STAGE_TONE[deal.stage]}>{deal.stage}</Tag>,
              },
              {
                key: 'amount',
                header: 'Amount',
                width: '8rem',
                align: 'end',
                sortable: true,
                render: (deal) => money(deal.amount),
              },
            ]}
            rows={rows}
            rowKey={(deal) => deal.id}
          />
        </div>

        {/* One menu for the whole table, in controlled mode — a table cannot
            wrap each row in its own, and mounting 150 of them would be absurd. */}
        <ContextMenu
          point={menu}
          onPointChange={setMenu}
          aria-label="Row actions"
          items={[
            { kind: 'label', id: 'row', label: menuRow ?? 'Row' },
            { id: 'open', label: 'Open', onSelect: () => {} },
            { id: 'copy', label: 'Copy link', shortcut: ['mod', 'c'], onSelect: () => {} },
            { kind: 'separator', id: 's' },
            { id: 'unassign', label: 'Remove owner', tone: 'danger', onSelect: () => {} },
          ]}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-text-muted">Loading</p>
            <div className="rounded-card border border-border">
              <DataTable<Deal>
                loading
                skeletonRows={4}
                density={density}
                columns={[
                  { key: 'name', header: 'Deal' },
                  { key: 'amount', header: 'Amount', width: '7rem', align: 'end' },
                ]}
                rows={[]}
                rowKey={(deal) => deal.id}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-text-muted">Empty</p>
            <div className="rounded-card border border-border">
              <DataTable<Deal>
                columns={[{ key: 'name', header: 'Deal' }]}
                rows={[]}
                rowKey={(deal) => deal.id}
                empty={<EmptyState title="Nothing here" description="No rows match this filter." />}
              />
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        name="DataTable · inline editing"
        tokens="border-accent editor · Spinner / IconCheck / IconWarning · lib/tableEdit"
      >
        <Note>
          Click a cell, or press Enter on it. Enter commits and drops to the same column one row down, Tab crosses to
          the next editable cell and wraps onto the next record, Escape throws the draft away, and clicking elsewhere
          commits. Every save here takes 700ms and some of them refuse — an empty value, or an email with no{' '}
          <code className="font-mono text-micro">@</code> — so the pending, saved and failed states are all reachable.
          The failed one keeps its message until you edit the cell again, because nothing server-side recorded that the
          write was rejected. <strong>Name</strong> is locked on the restricted record and <strong>Stage</strong> edits
          through a <code className="font-mono text-micro">select</code> rather than the default text input. Blur on an
          unchanged cell fires nothing at all: on this API a write CREATES the attribute, so a no-op write is not free.
          This table also has row navigation and selection on, which is the configuration where an editor has to fight
          for its own keys — type a space into a cell and it types a space rather than selecting the row, and Home goes
          to the start of the value rather than to the first record.
        </Note>
        <EditableTableDemo />
      </Demo>

      <Demo name="Breadcrumbs" tokens="text-meta · aria-current page · middle collapse">
        <Note>
          The trail above a record page — it lives inside the module, so it never repeats the product name the shell is
          already showing. The last item is plain text with{' '}
          <code className="font-mono text-micro">aria-current=&quot;page&quot;</code>, never a link: a link to the page
          you are on is a control that does nothing. The middle collapses, and only when it hides at least two steps —
          an ellipsis standing in for one item is one slot replaced by one slot. Click it to expand in place.
        </Note>
        <div className="max-w-md space-y-3">
          <Breadcrumbs
            items={[
              { id: 'contacts', label: 'Contacts', icon: <IconContacts size={12} />, onSelect: () => {} },
              { id: 'anna', label: 'Anna Koch' },
            ]}
          />
          {/* The href branch: a real anchor, so it can be middle-clicked and
              copied. A step that only changes state in the module passes
              onSelect instead and renders as a button. */}
          <Breadcrumbs
            items={[
              {
                id: 'contacts',
                label: 'Contacts',
                icon: <IconContacts size={12} />,
                href: '#contacts',
              },
              { id: 'vip', label: 'VIP customers', href: '#vip' },
              { id: 'anna', label: 'Anna Koch' },
            ]}
          />
          <Breadcrumbs
            items={[
              { id: 'contacts', label: 'Contacts', icon: <IconContacts size={12} />, onSelect: () => {} },
              { id: 'vip', label: 'VIP customers', onSelect: () => {} },
              { id: 'de', label: 'Germany', onSelect: () => {} },
              { id: 'berlin', label: 'Berlin', onSelect: () => {} },
              { id: 'anna', label: 'Anna Koch, who has an unusually long display name' },
            ]}
          />
        </div>
      </Demo>

      <Demo name="Pagination" tokens="accent-soft current · tabular-nums · constant width">
        <Note>
          The window keeps a constant number of slots as it slides, so the buttons never shuffle sideways under the
          cursor. An ellipsis always stands in for at least two pages — hiding a single page behind one would cost a
          click for nothing.
        </Note>
        <div className="max-w-lg space-y-4">
          <Pagination
            page={page}
            pageCount={20}
            onChange={setPage}
            summary={`${(page - 1) * 20 + 1}–${page * 20} of 400`}
          />
          <Pagination page={1} pageCount={4} onChange={() => {}} summary="1–20 of 68" />
        </div>
      </Demo>

      <Demo name="StatTile" tokens="Card · text-2xl figure in text-text · text-micro coverage · opacity-60 stale">
        <Note>
          The number is the chart. Label, figure, one line of detail, and the coverage sentence every tile repeats — a
          number without its window is a number nobody can trust, so{' '}
          <code className="font-mono text-micro">coverage</code> is required. The figure wears the text token, never a
          series colour; a null rate arrives already formatted as <code className="font-mono text-micro">—</code>,
          because 0% would claim a perfect record. <code className="font-mono text-micro">stale</code> dims the tile
          while a refetch is in flight instead of flashing a skeleton.
        </Note>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Booked" value="128" detail="31 this week" coverage="Last 30 days · all staff" />
          <StatTile
            label="Attendance rate"
            value="86%"
            detail="110 attended · 18 no-shows"
            coverage="Last 30 days · all staff"
          />
          <StatTile
            label="Cancellation rate"
            value="—"
            detail="No resolved bookings yet"
            coverage="Last 30 days · all staff"
          />
          <StatTile
            label="Attended revenue"
            value="€4,320"
            detail="Avg €39 per visit"
            coverage="Last 30 days · all staff"
            stale
          />
        </div>
      </Demo>

      <Demo name="StackedMeter" tokens="event-1…8 solid · surface-sunken track">
        <Note>
          A composition, not a gauge. <code className="font-mono">Progress</code> answers &ldquo;how far along&rdquo;
          and reads better the fuller it is; this answers &ldquo;what is it made of&rdquo; and reads WORSE the more one
          colour dominates. Pass <code className="font-mono">total</code> only when a real ceiling exists &mdash; with
          no ceiling the denominator is the segments&rsquo; own sum, which is the honest default. A segment with a tiny
          but real value keeps a visible sliver, because &ldquo;almost nothing&rdquo; and &ldquo;nothing&rdquo; are
          different answers.
        </Note>
        <div className="max-w-md space-y-6">
          <StackedMeter
            label="Characters the assistant reads"
            segments={[
              { id: 'profile', label: 'Business profile', value: 240, tone: 1, display: '240' },
              { id: 'instructions', label: 'AI instructions', value: 380, tone: 3, display: '380' },
              { id: 'faq', label: 'FAQ', value: 1840, tone: 2, display: '1 840' },
              { id: 'products', label: 'Products', value: 920, tone: 5, display: '920' },
              { id: 'other', label: 'Other', value: 60, display: '60' },
            ]}
            footer="3 440 characters in total, read on every message."
          />
          <StackedMeter
            label="Characters the assistant reads"
            compact
            segments={[
              { id: 'faq', label: 'FAQ', value: 1840, tone: 2 },
              { id: 'products', label: 'Products', value: 920, tone: 5 },
            ]}
          />
          <StackedMeter label="Characters the assistant reads" segments={[]} />
        </div>
      </Demo>

      {/* The tokens line avoids arbitrary-value syntax on purpose: Tailwind
          scans this file for class candidates and would emit a dead rule for it. */}
      <Demo name="Tabs · Collapsible" tokens="border-accent active · grid-template-rows 0fr to 1fr">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'team', label: 'Team' },
            { id: 'billing', label: 'Billing' },
          ]}
          active={tab}
          onSelect={setTab}
        />
        <p className="mb-4 mt-3 text-sm text-text-muted">Active tab: {tab}</p>

        <Note>
          The height animation is the <code className="font-mono text-micro">grid-template-rows: 0fr → 1fr</code> trick
          — the only CSS-only way to transition to a content-derived height. Measuring scrollHeight instead needs a
          ResizeObserver and still gets it wrong when a font loads late.
        </Note>
        <div className="max-w-lg rounded-card border border-border p-3">
          <Collapsible
            open={open}
            onOpenChange={setOpen}
            trigger="Advanced filters"
            meta={<Tag tone="accent">3 active</Tag>}
          >
            <div className="space-y-2 pt-2 text-sm text-text-muted">
              <p>Collapsed content is made inert, so Tab skips it rather than landing on something invisible.</p>
              <Row>
                <Button size="sm" variant="ghost">
                  A focusable button
                </Button>
                <Button size="sm" variant="ghost">
                  And another
                </Button>
              </Row>
            </div>
          </Collapsible>
        </div>
      </Demo>
    </div>
  );
}

interface Person {
  id: string;
  name: string;
  email: string;
  city: string;
  stage: 'New' | 'Ready' | 'Won' | 'Lost';
  restricted?: boolean;
}

const PEOPLE: Person[] = [
  { id: 'p1', name: 'Anna Koch', email: 'anna@example.com', city: 'Berlin', stage: 'Ready' },
  { id: 'p2', name: 'Grace Hopper', email: 'grace@example.com', city: 'Arlington', stage: 'Won' },
  { id: 'p3', name: 'Alan Turing', email: 'alan@example.com', city: 'Wilmslow', stage: 'New' },
  { id: 'p4', name: 'Restricted contact', email: '—', city: '—', stage: 'New', restricted: true },
  { id: 'p5', name: 'Radia Perlman', email: 'radia@example.com', city: 'Boston', stage: 'Ready' },
];

const STAGE_OPTIONS: Person['stage'][] = ['New', 'Ready', 'Won', 'Lost'];

/**
 * The proving ground for editable cells and column reorder.
 *
 * Shaped like the contacts table rather than a toy: a locked record that must
 * refuse every edit, one column pinned out of the reorder, a select editor
 * beside three text ones, and saves that take real time and sometimes refuse.
 * Those are the parts a minimal demo skips and the parts the bugs live in.
 */
function EditableTableDemo() {
  const [people, setPeople] = useState(PEOPLE);
  const [order, setOrder] = useState(['name', 'email', 'city', 'stage']);
  const [log, setLog] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const save = (person: Person, field: 'name' | 'email' | 'city' | 'stage', value: string) =>
    new Promise<void>((resolve, reject) => {
      window.setTimeout(() => {
        if (value.trim() === '') {
          reject(new Error('This field cannot be empty'));
          return;
        }
        if (field === 'email' && !value.includes('@')) {
          /* A plain object, not an Error — this is the shape a GraphQL failure
             actually arrives in, and the cell has to read the message off it. */
          reject({ message: 'Not an email address' });
          return;
        }
        setPeople((prev) => prev.map((each) => (each.id === person.id ? { ...each, [field]: value } : each)));
        setLog((prev) => [`${person.name} · ${field} → ${value}`, ...prev].slice(0, 4));
        resolve();
      }, 700);
    });

  const byKey: Record<string, DataTableColumn<Person>> = {
    name: {
      key: 'name',
      header: 'Name',
      width: '13rem',
      minWidth: 130,
      sortable: true,
      resizable: true,
      /* The identity column everything else is read against: it stays first. */
      reorderable: false,
      render: (person) =>
        person.restricted ? (
          <span className="flex items-center gap-2 text-text-faint">
            <IconLock size={14} />
            {person.name}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Avatar name={person.name} size={20} />
            <span className="truncate font-medium text-text">{person.name}</span>
          </span>
        ),
      edit: {
        value: (person) => person.name,
        commit: (person, value) => save(person, 'name', value),
        enabled: (person) => person.restricted !== true,
      },
    },
    email: {
      key: 'email',
      header: 'Email',
      width: '14rem',
      sortable: true,
      resizable: true,
      edit: {
        value: (person) => person.email,
        commit: (person, value) => save(person, 'email', value),
        placeholder: 'name@example.com',
      },
    },
    city: {
      key: 'city',
      header: 'City',
      width: '9rem',
      resizable: true,
      edit: {
        value: (person) => person.city,
        commit: (person, value) => save(person, 'city', value),
      },
    },
    stage: {
      key: 'stage',
      header: 'Stage',
      width: '8rem',
      render: (person) => <Tag tone={STAGE_TONE[person.stage]}>{person.stage}</Tag>,
      edit: {
        value: (person) => person.stage,
        commit: (person, value) => save(person, 'stage', value),
        render: ({ value, commit, inputProps }) => (
          <select
            {...inputProps}
            value={value}
            /* commit takes the new value: a change event carries it, and
               setValue-then-commit would save the option before this one. */
            onChange={(event) => commit(event.target.value)}
            className="h-6 w-full rounded-control border border-accent bg-surface-raised px-1 text-text focus-visible:focus-ring"
          >
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        ),
      },
    },
  };

  return (
    <>
      <div className="rounded-card border border-border">
        <DataTable<Person>
          stickyHeader
          rowNavigation
          caption="Editable contacts"
          columns={order.map((key) => byKey[key]!)}
          rows={people}
          rowKey={(person) => person.id}
          selectedIds={selected}
          onSelectionChange={setSelected}
          isRowDisabled={(person) => person.restricted === true}
          onColumnOrderChange={setOrder}
        />
      </div>
      <p className="mt-2 text-micro text-text-muted">
        Column order: <code className="font-mono">{order.join(' · ')}</code> — drag a header, or tab to a grip and press
        Space, then the arrows. Escape puts it back where it was grabbed from; tabbing away drops it where it now is.
        Name is pinned out of the reorder, and &ldquo;pinned&rdquo; means its INDEX is fixed: neither route can push it
        off position one, and neither can pick it up. Sorting still works on the header you just dragged — the click the
        browser fires at the end of a drag is swallowed, and only that one.
      </p>
      {log.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-micro text-text-faint">
          {log.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
