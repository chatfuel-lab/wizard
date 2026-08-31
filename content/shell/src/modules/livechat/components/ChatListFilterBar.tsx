import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Checkbox, IconFilter, IconSearch, Input, Popover, Select, Toolbar } from '~ui';
import { useInboxTeam } from '../hooks/useInboxTeam';
import { SavedViewsMenu } from './SavedViewsMenu';
import {
  ASSIGNEE_PRESETS,
  ASSIGNEE_PRESET_LABELS,
  STAGES,
  STAGE_LABELS,
  activeFilterCount,
  clearInboxFilter,
  isInboxFilterEmpty,
  toggleStage,
  userAssigneeKey,
  withAllStages,
  withAssignee,
  withQuery,
  withUnreadOnly,
  type AssigneeKey,
  type InboxFilter,
} from '../lib/inboxFilter';

/** Long enough that a typed word is one request, short enough to feel immediate. */
const SEARCH_DEBOUNCE_MS = 300;

export interface ChatListFilterBarProps {
  filter: InboxFilter;
  onChange: (next: InboxFilter) => void;
  /** What the filter matches server-side, or null while that is unknown. */
  count: number | null;
}

/**
 * Everything that narrows the inbox, in a pane that can be the entire screen.
 *
 * The layout is two rows rather than one because this pane is 20rem inside the
 * shell and 360px on a phone — there is no width at which a search box, an
 * assignee picker, six stages and an unread toggle fit on a line. `Toolbar`
 * wraps, so the search box claims the first row by having a minimum width the
 * rest cannot squeeze past, and everything else falls to the second. No
 * viewport prefix is involved: the pane is not the window, and below the
 * collapse band there is no second pane to be narrower than.
 *
 * The secondary controls live behind one popover for the same reason. It also
 * buys the badge — a reader who has scrolled away from the bar can still see
 * that three things are narrowing what they are looking at.
 *
 * Search is DEBOUNCED and its text is held here, not in the filter. Pushing a
 * keystroke straight up would be a query, a subscription teardown and a
 * re-established WebSocket per letter — the filter's identity is what
 * `useChatListStore` keys its whole lifecycle on. The timer is keyed on the text
 * alone and reads the current callback from a ref, because `onChange` is a
 * fresh closure on every render and a dependency on it would restart the
 * countdown on renders that have nothing to do with typing.
 */
export function ChatListFilterBar({ filter, onChange, count }: ChatListFilterBarProps) {
  const team = useInboxTeam();
  const [text, setText] = useState(filter.q);
  const latest = useRef({ filter, onChange });

  useEffect(() => {
    latest.current = { filter, onChange };
  });

  // An outside change — Clear, a restored filter — wins over the local text.
  useEffect(() => setText(filter.q), [filter.q]);

  useEffect(() => {
    if (text === latest.current.filter.q) return;
    const timer = setTimeout(() => {
      const { filter: current, onChange: push } = latest.current;
      push(withQuery(current, text));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const narrowed = activeFilterCount(filter);

  const assigneeOptions = [
    ...ASSIGNEE_PRESETS.map((key) => ({ value: key, label: ASSIGNEE_PRESET_LABELS[key] })),
    ...team.members.map((member) => ({
      value: userAssigneeKey(member.user.id),
      label: member.user.name,
    })),
  ];
  /* A filter naming someone who has since left the team still renders. Quietly
     resetting it to Anyone would widen the result set under the reader without
     saying so. */
  if (!assigneeOptions.some((option) => option.value === filter.assignee)) {
    assigneeOptions.push({ value: filter.assignee, label: 'Someone no longer on the team' });
  }

  return (
    <Toolbar>
      <div className="relative min-w-48 flex-1">
        <IconSearch
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          type="search"
          aria-label="Search conversations by name or phone"
          placeholder="Search name or phone…"
          className="pl-8"
          value={text}
          onChange={(event) => setText(event.target.value)}
          /* The `/` shortcut and the palette's "Search conversations" reach
             this box through the DOM rather than a ref threaded down three
             components. The attribute is the contract. */
          data-inbox-search
        />
      </div>

      <SavedViewsMenu
        filter={filter}
        onApply={onChange}
        /* The saved filter keeps the UserAccountID; the NAME is looked up now,
           so a view saved against a teammate who has since been renamed shows
           the current name rather than a snapshot of it. */
        teamName={(id) => team.members.find((member) => member.user.id === id)?.user.name ?? 'Someone'}
      />

      <Popover
        aria-label="Filters"
        placement="bottom-start"
        trigger={(props) => (
          <Button variant="ghost" size="sm" {...props}>
            <IconFilter size={14} />
            Filters
            <Badge count={narrowed} />
          </Button>
        )}
      >
        <div className="flex w-56 flex-col gap-3">
          <label className="flex flex-col gap-1 text-label text-text-muted">
            Assigned to
            <Select
              aria-label="Filter by assignee"
              value={filter.assignee}
              onChange={(next) => onChange(withAssignee(filter, next as AssigneeKey))}
              options={assigneeOptions}
            />
          </label>

          <Checkbox
            checked={filter.unreadOnly}
            onChange={(checked) => onChange(withUnreadOnly(filter, checked))}
            label="Unread only"
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-text-muted">Sales stage</span>
            {STAGES.map((stage) => (
              <Checkbox
                key={stage}
                /* An empty selection means "do not narrow", so it renders as all
                   six ticked — and `toggleStage` reads it the same way, which is
                   what makes unticking one mean "all but this". */
                checked={filter.stages.length === 0 || filter.stages.includes(stage)}
                onChange={() => onChange(toggleStage(filter, stage))}
                label={STAGE_LABELS[stage]}
              />
            ))}
            {filter.stages.length > 0 ? (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange(withAllStages(filter))}>
                All stages
              </Button>
            ) : null}
          </div>
        </div>
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        {/* The server's answer for the whole filter, not `chats.length` — the
            list holds one page, so counting the rows would report 50 for an
            inbox of nine hundred. `tabular-nums` keeps it from twitching as
            the digits change.

            The element is always mounted, empty while the count is unknown,
            rather than conditionally rendered: a live region has to exist
            before its content changes or the change is not announced, so the
            version that appears along with its first number announces nothing
            at all. */}
        <span aria-live="polite" className="text-meta tabular-nums text-text-muted">
          {count === null ? '' : count.toLocaleString()}
        </span>
        {isInboxFilterEmpty(filter) ? null : (
          <Button variant="ghost" size="sm" onClick={() => onChange(clearInboxFilter(filter))}>
            Clear
          </Button>
        )}
      </div>
    </Toolbar>
  );
}
