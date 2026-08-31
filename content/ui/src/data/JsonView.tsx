import { useState } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { IconCheck, IconChevronDown, IconCopy, IconWarning } from '../icons';
import {
  entriesOf,
  formatScalar,
  isExpandable,
  jsonKind,
  opensByDefault,
  stringifyJson,
  summarize,
  truncateText,
  type JsonKind,
} from '../lib/chat/jsonTree';

export interface JsonViewProps {
  value: unknown;
  /** Names the root row. The argument's name, usually. */
  name?: string;
  /** Rows below this depth hide behind a "deeper" marker. Default 4. */
  maxDepth?: number;
  /** Depth down to which small containers start open. Default 2. */
  autoExpandDepth?: number;
  /** Strings longer than this truncate with a "show all". Default 140. */
  stringLimit?: number;
  /** A copy button for the whole value. */
  copyable?: boolean;
  className?: string;
}

/*
 * Colour by type, which is the one thing that makes a JSON dump scannable.
 *
 * The four are drawn from the status ramp rather than from a bespoke syntax
 * palette because they already have dark values that were chosen against this
 * system's surfaces: a hand-picked green would have to be re-picked for the
 * dark theme, and this file is not allowed to name a colour anyway (pass 11b).
 *
 * `unsupported` is deliberately loud. `undefined` cannot come out of JSON, so
 * seeing it means a caller handed this a live object, and a viewer that showed
 * it as a quiet grey `null` would be lying about the value being approved.
 */
const KIND_CLASSES: Record<JsonKind, string> = {
  string: 'text-success',
  number: 'text-info',
  boolean: 'text-accent',
  null: 'text-text-faint',
  array: 'text-text-muted',
  object: 'text-text-muted',
  unsupported: 'text-warning',
};

interface RowProps {
  label: string;
  value: unknown;
  path: string;
  depth: number;
  maxDepth: number;
  autoExpandDepth: number;
  stringLimit: number;
  /** True for an array element, which is indexed rather than named. */
  indexed: boolean;
}

function JsonRow({ label, value, path, depth, maxDepth, autoExpandDepth, stringLimit, indexed }: RowProps) {
  const expandable = isExpandable(value);
  const [open, setOpen] = useState(() => opensByDefault(value, depth, autoExpandDepth));
  const [showAll, setShowAll] = useState(false);
  /* The depth limit is a budget, not a wall: reaching it renders a marker the
     reader can spend another budget on. A hard stop would put `price.amount` —
     the number a person is approving — permanently out of reach on a deep
     argument, and an unbounded walk would take the dashboard down on a value
     that contains itself. */
  const [extraDepth, setExtraDepth] = useState(0);
  const limit = maxDepth + extraDepth;

  const summary = summarize(value);
  const kindClass = KIND_CLASSES[summary.kind];

  const key = (
    <span className="shrink-0 font-mono text-meta">
      <span className={indexed ? 'text-text-faint' : 'text-text'}>{label}</span>
      <span className="text-text-faint">: </span>
    </span>
  );

  if (!expandable) {
    if (summary.kind === 'string') {
      const raw = value as string;
      const cut = truncateText(raw, stringLimit);
      return (
        <div className="flex min-w-0 items-baseline gap-0.5 py-0.5">
          {key}
          <span className={`min-w-0 break-words font-mono text-meta ${kindClass}`}>
            {showAll || !cut.truncated ? formatScalar(raw) : `${formatScalar(cut.text).slice(0, -1)}…"`}
            {cut.truncated ? (
              <button
                type="button"
                onClick={() => setShowAll((previous) => !previous)}
                className="ml-1.5 rounded-chip px-1 text-nano text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
              >
                {showAll ? 'less' : `+${cut.hidden}`}
              </button>
            ) : null}
          </span>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 items-baseline gap-0.5 py-0.5">
        {key}
        <span className={`min-w-0 break-all font-mono text-meta ${kindClass}`}>{summary.label}</span>
      </div>
    );
  }

  if (depth >= limit) {
    return (
      <div className="flex min-w-0 items-baseline gap-0.5 py-0.5">
        {key}
        <button
          type="button"
          onClick={() => setExtraDepth((previous) => previous + maxDepth)}
          className="rounded-chip px-1 font-mono text-meta text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
        >
          {summary.label} — deeper
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className="-ml-1 flex min-w-0 max-w-full items-baseline gap-0.5 rounded-chip px-1 py-0.5 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring"
      >
        <IconChevronDown
          size={12}
          aria-hidden
          className={`shrink-0 translate-y-px text-text-faint transition-transform duration-fast ease-standard ${
            open ? '' : '-rotate-90'
          }`}
        />
        {key}
        <span className={`truncate font-mono text-meta ${kindClass}`}>{summary.label}</span>
      </button>

      {open ? (
        /* The rule is the nesting cue. Indentation alone stops being readable
           at the third level, which is exactly where a tool argument gets
           interesting. */
        <div className="ml-2 min-w-0 border-l border-border-subtle pl-3">
          {entriesOf(value, path).map((entry) => (
            <JsonRow
              key={entry.path}
              label={entry.key}
              value={entry.value}
              path={entry.path}
              depth={depth + 1}
              /* The extended budget travels down, or spending it would buy one
                 level and the next row would ask for another click. */
              maxDepth={limit}
              autoExpandDepth={autoExpandDepth}
              stringLimit={stringLimit}
              indexed={Array.isArray(value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Nested JSON, one collapsible row at a time.
 *
 * ## What it replaces, and why that matters here
 *
 * `JSON.stringify(args, null, 2)` inside a `<pre>`. That is what a pending tool
 * approval shows today — sixteen lines of braces for a batch the operator has
 * to say yes or no to, where yes means the account changes. The decision is
 * "does this create the right service at the right price", and the shape it is
 * asked in is a wall of punctuation.
 *
 * So: keys that stay put, values coloured by type so `"12"` and `12` are
 * visibly different things, containers that fold with a count on them, and long
 * prose cut to a line with the rest one click away. Every one of those rules is
 * in `lib/chat/jsonTree.ts` with a test, because they are decisions about data
 * rather than about layout.
 *
 * ## Buttons, not a tree widget
 *
 * `role="tree"` with roving focus is the textbook answer and it is the wrong
 * one here. The values this renders are a dozen rows, and a tree widget
 * swallows the arrow keys — inside a thread the reader is scrolling with, and
 * next to an Approve button they are trying to Tab to. Plain buttons with
 * `aria-expanded` say the same thing to a screen reader and surprise nobody.
 */
export function JsonView({
  value,
  name = 'arguments',
  maxDepth = 4,
  autoExpandDepth = 2,
  stringLimit = 140,
  copyable = true,
  className = '',
}: JsonViewProps) {
  const { copy, copied, failed } = useCopyToClipboard();
  const json = copyable ? stringifyJson(value) : null;
  const kind = jsonKind(value);

  return (
    <div className={`min-w-0 ${className}`}>
      {json === null ? null : (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={() => copy(json)}
            aria-label={copied ? 'Copied' : 'Copy as JSON'}
            className="flex items-center gap-1 rounded-chip px-1.5 py-0.5 text-nano text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
          >
            {failed ? <IconWarning size={11} /> : copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
            {failed ? 'Press Ctrl+C' : copied ? 'Copied' : 'JSON'}
          </button>
        </div>
      )}

      {kind === 'object' || kind === 'array' ? (
        /* The root container is unwrapped: a row reading `arguments: {…} 2 keys`
           above the two keys is a level of nesting that carries no information,
           and it costs the reader a click on the one thing they came to read. */
        entriesOf(value).map((entry) => (
          <JsonRow
            key={entry.path}
            label={entry.key}
            value={entry.value}
            path={entry.path}
            depth={0}
            maxDepth={maxDepth}
            autoExpandDepth={autoExpandDepth}
            stringLimit={stringLimit}
            indexed={Array.isArray(value)}
          />
        ))
      ) : (
        <JsonRow
          label={name}
          value={value}
          path={name}
          depth={0}
          maxDepth={maxDepth}
          autoExpandDepth={autoExpandDepth}
          stringLimit={stringLimit}
          indexed={false}
        />
      )}

      {(kind === 'object' || kind === 'array') && entriesOf(value).length === 0 ? (
        <span className="font-mono text-meta text-text-faint">{summarize(value).label}</span>
      ) : null}
    </div>
  );
}
