import type { ReactNode, RefObject } from 'react';
import { Button, Dialog, IconClose, Overlay } from '~ui';

export interface WizardFrameProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** `wizardHost(band) === 'fullscreen'`: the whole viewport instead of a centred dialog. */
  fullscreen: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Where the wizard lives: a `Dialog` with room (xl, not lg: six Stepper labels
 * truncate at 42rem, and the service cards want two columns), or — in the
 * compact band, where any dialog would be a letterbox — a full-viewport panel
 * on the same `Overlay` (bottom-aligned, so it slides up like a sheet and
 * fills the screen). Same header, body and footer either way; the steps never
 * know. The body is its own `@container`: a portalled dialog sits outside
 * `ModuleRoot`, so `@compact:` inside it reads the dialog's width, not the module's.
 */
export function WizardFrame({ open, onClose, title, fullscreen, initialFocusRef, footer, children }: WizardFrameProps) {
  if (!fullscreen) {
    return (
      <Dialog open={open} onClose={onClose} title={title} size="xl" initialFocusRef={initialFocusRef} footer={footer}>
        {children}
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
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border p-3">{footer}</div>
        </div>
      )}
    </Overlay>
  );
}
