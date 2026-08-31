import { Dialog, type DialogSize } from '../overlay/Dialog';
import { Kbd } from '../primitives/Kbd';

/**
 * One row of the sheet. The row shape deliberately carries no handler and no
 * id: the same list that renders here is the list the app's key handlers are
 * built from, and keeping this half data-only is what lets a test assert the
 * two sides against each other.
 */
export interface ShortcutRow {
  section: string;
  label: string;
  /** A qualifier under the label — "only while a row is selected". */
  note?: string;
  /** Key chips, in press order; each chip is one combination. */
  chips: readonly (readonly string[])[];
  /** Printed between the chips — "then", "or". Omit for a plain gap. */
  joiner?: string;
}

export interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Section headings, in display order. A section no row names is skipped. */
  sections: readonly string[];
  rows: readonly ShortcutRow[];
  size?: DialogSize;
}

/**
 * The `?` sheet, rendered straight from the caller's shortcut table.
 *
 * Nothing here restates a key. That is the whole point: a cheat sheet with its
 * own copy of the map goes wrong silently — no test fails, no type breaks, the
 * documentation is just quietly untrue. The rows and the handlers must come
 * from one list, pinned by a test on the caller's side.
 */
export function ShortcutsDialog({ open, onClose, sections, rows, size = 'md' }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" size={size}>
      <div className="flex flex-col gap-5">
        {sections.map((section) => {
          const sectionRows = rows.filter((row) => row.section === section);
          if (sectionRows.length === 0) return null;

          return (
            <section key={section}>
              <h3 className="mb-2 text-micro font-medium uppercase tracking-wide text-text-faint">{section}</h3>
              <dl className="flex flex-col gap-2">
                {sectionRows.map((row) => (
                  <div key={`${row.section}:${row.label}`} className="flex items-baseline justify-between gap-4">
                    <dt className="min-w-0">
                      <span className="text-body text-text">{row.label}</span>
                      {row.note ? (
                        <span className="mt-0.5 block text-meta leading-snug text-text-muted">{row.note}</span>
                      ) : null}
                    </dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {row.chips.map((chip, index) => (
                        <span key={chip.join('+')} className="flex items-center gap-1">
                          {index > 0 && row.joiner ? (
                            <span className="text-micro text-text-faint">{row.joiner}</span>
                          ) : null}
                          <Kbd keys={chip} />
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
