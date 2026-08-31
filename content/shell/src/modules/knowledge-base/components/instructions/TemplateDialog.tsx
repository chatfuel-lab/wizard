import { useEffect, useState } from 'react';
import { Button, Dialog, IconChevronDown } from '~ui';
import { INSTRUCTIONS_TEMPLATES, type InsertMode, type InstructionsTemplate } from '../../lib/instructionsTemplates';

export interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  /** True when the editor already holds something — then inserting is a choice, not a click. */
  hasText: boolean;
  onInsert: (template: InstructionsTemplate, mode: InsertMode) => void;
}

/**
 * The starter library.
 *
 * One expandable row per template with the whole prompt visible before it is
 * used, because a "template" a person cannot read first is a surprise they
 * then have to undo. Into an empty editor it is one button; into an editor
 * that already holds something the row asks, and offers both answers rather
 * than picking one — appending is right when somebody is assembling a prompt
 * and wrong when they are starting over, and only they know which.
 */
export function TemplateDialog({ open, onClose, hasText, onInsert }: TemplateDialogProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  /* A reopened dialog starts collapsed: the row that was open belonged to the
     last visit and the list is what this one is for. */
  useEffect(() => {
    if (open) setExpanded(null);
  }, [open]);

  const insert = (template: InstructionsTemplate, mode: InsertMode) => {
    onInsert(template, mode);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Starter instructions" size="lg">
      <p className="mb-3 text-sm text-text-muted">
        Role, task, output format, example — the shape the assistant follows best. Every one of them is a starting point
        to edit, and none of them contains a fact: prices, hours and answers belong in the other sources.
      </p>
      <ul className="flex flex-col gap-2">
        {INSTRUCTIONS_TEMPLATES.map((template) => {
          const isOpen = expanded === template.id;
          return (
            <li key={template.id} className="overflow-hidden rounded-card border border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : template.id)}
                className="flex w-full items-start gap-2 p-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring"
              >
                <IconChevronDown
                  size={14}
                  className={`mt-0.5 shrink-0 text-text-muted transition-transform duration-fast ease-standard ${isOpen ? '' : '-rotate-90'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text">{template.name}</span>
                  <span className="mt-0.5 block text-xs text-text-muted">{template.forWhom}</span>
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-border-subtle p-3">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-control bg-surface-sunken p-3 font-sans text-xs text-text">
                    {template.body}
                  </pre>
                  <div className="mt-3 flex flex-col gap-2 @compact:flex-row">
                    {hasText ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => insert(template, 'replace')}
                          className="w-full @compact:w-auto"
                        >
                          Replace what is there
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => insert(template, 'append')}
                          className="w-full @compact:w-auto"
                        >
                          Add to the end
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => insert(template, 'replace')} className="w-full @compact:w-auto">
                        Use this template
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
