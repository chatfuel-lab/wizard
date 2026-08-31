import { Card, IconArrowRight, IconSparkles } from '~ui';
import type { FirstStep } from '../../lib/overview';
import type { SourceId } from '../../lib/sources';

export interface FirstRunPanelProps {
  steps: readonly FirstStep[];
  onOpen: (source: SourceId) => void;
}

/**
 * What an empty knowledge base gets instead of the health page.
 *
 * A fresh bot lints to a page of red — no company name, no phone, no FAQs, no
 * products — and that list is technically correct and completely useless: it
 * tells someone who has written nothing that they have written nothing, twelve
 * times. Two steps, in order, is the whole of what is useful at this moment.
 */
export function FirstRunPanel({ steps, onOpen }: FirstRunPanelProps) {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-card bg-accent-soft text-accent">
          <IconSparkles size={18} />
        </span>
        <h2 className="mt-2 text-title font-semibold text-text">Your assistant knows nothing yet</h2>
        <p className="text-sm text-text-muted">
          Everything on the sources beside this page is read by the AI on every message. Two of them are worth doing
          before anything else.
        </p>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={step.source}>
            <button
              type="button"
              onClick={() => onOpen(step.source)}
              className="flex w-full items-start gap-3 rounded-card border border-border p-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring"
            >
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-micro font-semibold text-text-muted"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text">{step.title}</span>
                <span className="mt-0.5 block text-xs text-text-muted">{step.detail}</span>
              </span>
              <IconArrowRight size={16} className="mt-0.5 shrink-0 text-text-faint" />
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs text-text-faint">
        There is no site to crawl and no files to upload — Chatfuel’s knowledge base is what you type into it, and the
        assistant reads all of it every time.
      </p>
    </Card>
  );
}
