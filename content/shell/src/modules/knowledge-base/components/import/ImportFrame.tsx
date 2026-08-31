import type { ReactNode, RefObject } from 'react';
import { bandAtLeast, Button, Dialog, IconClose, Overlay, type Band } from '~ui';

export interface ImportFrameProps {
  open: boolean;
  onClose: () => void;
  title: string;
  band: Band;
  initialFocusRef?: RefObject<HTMLElement | null>;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Where the import wizard lives: a wide dialog, or the whole surface in the
 * compact band where a centred dialog would be a letterbox with a table in it.
 *
 * The body is its own `@container`, because a portalled dialog sits outside
 * `ModuleRoot` and `@compact:` inside it would otherwise be measuring the
 * module, not the dialog.
 */
export function ImportFrame({ open, onClose, title, band, initialFocusRef, footer, children }: ImportFrameProps) {
  if (bandAtLeast(band, 'narrow')) {
    return (
      <Dialog open={open} onClose={onClose} title={title} size="xl" initialFocusRef={initialFocusRef} footer={footer}>
        <div className="@container/import">{children}</div>
      </Dialog>
    );
  }
  return (
    <Overlay open={open} onClose={onClose} align="bottom" initialFocusRef={initialFocusRef}>
      {(state) => (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-state={state}
          className="flex h-full w-full flex-col bg-surface-overlay data-[state=entering]:animate-slide-in-bottom data-[state=exiting]:animate-slide-out-bottom"
        >
          <div className="flex h-topbar shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold text-text">{title}</span>
            <Button iconOnly variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <IconClose />
            </Button>
          </div>
          <div className="@container/import min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border p-3">{footer}</div>
        </div>
      )}
    </Overlay>
  );
}
