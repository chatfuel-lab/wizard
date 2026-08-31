import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useControllableState } from '../hooks/useControllableState';
import {
  IconBook,
  IconChevronDown,
  IconDatabase,
  IconGlobe,
  IconMonitor,
  IconNavigate,
  IconSearch,
  IconTool,
  type IconProps,
} from '../icons';
import { formatRunDuration, type RunState, type ToolFamily } from '../lib/chat/runStep';
import { Spinner } from '../primitives/Spinner';
import { useInRunGroup } from './internal/runGroupContext';

export interface RunStepProps {
  /**
   * The leading glyph — what kind of thing this is, not how it went. Pick it
   * from `TOOL_FAMILY_ICONS` with the family `describeTool` returned. Omitted,
   * a generic tool glyph stands in.
   */
  icon?: ReactNode;
  /** "Create service". `describeTool(toolID).title` produces these. */
  title: ReactNode;
  /** The one detail worth showing collapsed: an argument, a count, an error. */
  detail?: ReactNode;
  state: RunState;
  /** Milliseconds, or a string a caller already formatted. */
  duration?: number | string;
  /** What the row reveals — a `JsonView` of the arguments, usually. */
  children?: ReactNode;
  /** Whether it starts open. Ignored when `open` is passed. */
  defaultOpen?: boolean;
  /** Controlled disclosure. Pass both to drive it from outside. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * `danger` marks a step that DESTROYS something — a delete awaiting
   * approval. It is not `state: 'failed'`, and keeping them apart is the point:
   * failed is how the run went, danger is what the run will do, and the moment
   * that matters is before either has happened.
   */
  tone?: 'default' | 'danger';
  /** Trailing slot on the header row: Approve / Reject, a retry, a link. */
  actions?: ReactNode;
  className?: string;
}

/**
 * A glyph per tool family, so a caller can go from a tool id to an icon
 * without keeping its own map.
 *
 * The three built-ins get three different glyphs rather than one "built-in"
 * mark, because they are three unrelated acts: reading the operator's screen,
 * searching the product's documentation, and fetching a page off the open web.
 * Only the third leaves the building, and an operator should be able to see
 * that at a glance.
 */
export const TOOL_FAMILY_ICONS: Record<ToolFamily, (props: IconProps) => ReactNode> = {
  data: IconDatabase,
  navigation: IconNavigate,
  skill: IconBook,
  screen: IconMonitor,
  docs: IconSearch,
  web: IconGlobe,
  other: IconTool,
};

/* The chip behind the leading glyph. The tint IS the state — see the run
   semantics block in tokens.css for why running and skipped needed colours of
   their own rather than borrowing info and text-faint. */
const STATE_CHIP: Record<RunState, string> = {
  running: 'bg-run-active-soft text-run-active',
  done: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  skipped: 'bg-run-skipped-soft text-run-skipped',
};

const STATE_TITLE: Record<RunState, string> = {
  running: 'text-text',
  done: 'text-text',
  failed: 'text-danger',
  skipped: 'text-text-muted',
};

/* Always in the accessibility tree, and visible for the two states that are
   not self-evident from the trailing slot. A tint is not information to
   somebody who cannot see it, and "skipped" versus "done" is the difference
   between a thing that happened and a thing that did not. */
const STATE_LABEL: Record<RunState, string> = {
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
};

/**
 * One tool call, as a line an operator can read.
 *
 * ## What it replaces
 *
 * `<SystemLine>Ran prettify_tool_id</SystemLine>` — grey, centred, no
 * arguments, no outcome, no time, and only rendered at all if the message
 * carrying the call survived the module's empty-message filter, which it
 * usually does not. Every tool call produces two messages with empty `content`
 * and the second one carries `toolCalls`; dropping both is why tool activity is
 * invisible in the product today.
 *
 * ## The two axes
 *
 * A step says two things and they are deliberately drawn in different places:
 * **what kind of act this is** — the leading glyph, from the tool's family —
 * and **how it went** — the tint on that glyph plus the trailing slot. They are
 * separate because they answer different questions and change at different
 * times: the family is known the instant the call is requested, the outcome
 * arrives seconds later, and a card that redraws its icon when the result lands
 * reads as a different step arriving.
 *
 * ## Disclosure
 *
 * Collapsed by default, because the collapsed line is the whole point: four
 * steps in a row have to be four lines, not four JSON dumps. The exception is
 * the caller's — an approval card passes `defaultOpen`, since a person cannot
 * approve arguments they have to click to see.
 */
export function RunStep({
  icon,
  title,
  detail,
  state,
  duration,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  tone = 'default',
  actions,
  className = '',
}: RunStepProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  const panelId = useId();
  const grouped = useInRunGroup();
  const expandable = children !== undefined && children !== null && children !== false;

  const contentRef = useRef<HTMLDivElement>(null);
  /* Collapsed content is still in the tab order — zero height does not remove
     it — and a run of four collapsed steps would otherwise put every argument
     row of every one of them between the operator and the Approve button.
     Set as a DOM property, not a JSX attribute: React serialises
     `inert={false}` to the string "false", which the browser reads as true. */
  useEffect(() => {
    const node = contentRef.current;
    if (node) node.inert = !isOpen;
  }, [isOpen]);

  const elapsed = typeof duration === 'number' ? formatRunDuration(duration) : (duration ?? '');
  const chip = tone === 'danger' ? 'bg-danger-soft text-danger' : STATE_CHIP[state];

  const header = (
    <>
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-chip ${chip} [&_svg]:size-3.5`}
      >
        {state === 'running' ? (
          <Spinner size={12} className="border-current/30 border-t-current" />
        ) : (
          (icon ?? <IconTool />)
        )}
      </span>

      <span className={`min-w-0 truncate text-label font-medium ${STATE_TITLE[state]}`}>{title}</span>
      {detail !== undefined ? (
        <span className="min-w-0 flex-1 truncate text-meta text-text-muted">{detail}</span>
      ) : (
        <span className="flex-1" />
      )}

      {/* The word is always here; only two of the four states also show it,
          because "done" is already said by the duration beside it and
          "running" by the spinner in the chip. */}
      <span
        className={
          state === 'failed' || state === 'skipped'
            ? `shrink-0 text-meta ${state === 'failed' ? 'text-danger' : 'text-run-skipped'}`
            : 'sr-only'
        }
      >
        {STATE_LABEL[state]}
      </span>
      {elapsed === '' ? null : <span className="shrink-0 tabular-nums text-meta text-text-faint">{elapsed}</span>}
    </>
  );

  const rowClasses = `flex w-full items-center gap-2 px-3 py-2 text-left ${grouped ? '' : 'rounded-card'}`;

  return (
    <div
      className={`min-w-0 ${
        grouped
          ? ''
          : `overflow-hidden rounded-card border bg-surface-raised ${tone === 'danger' ? 'border-danger/30' : 'border-border'}`
      } ${className}`}
    >
      <div className="flex items-center">
        {expandable ? (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setOpen(!isOpen)}
            className={`${rowClasses} min-w-0 flex-1 transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring`}
          >
            {header}
            <IconChevronDown
              size={14}
              aria-hidden
              className={`shrink-0 text-text-faint transition-transform duration-fast ease-standard ${
                isOpen ? '' : '-rotate-90'
              }`}
            />
          </button>
        ) : (
          <div className={`${rowClasses} min-w-0 flex-1`}>{header}</div>
        )}
        {actions !== undefined ? <div className="flex shrink-0 items-center gap-1 pr-2">{actions}</div> : null}
      </div>

      {/* The grid-rows 0fr → 1fr trick, the same one `Collapsible` uses: the
          only CSS-only way to transition to a content-derived height. */}
      {expandable ? (
        <div
          id={panelId}
          className={`grid transition-[grid-template-rows] duration-base ease-standard ${
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div ref={contentRef} className="overflow-hidden">
            <div className="min-w-0 border-t border-border-subtle px-3 py-2.5">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
