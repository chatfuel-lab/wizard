import type { ReactNode } from 'react';
import { IconCheck, IconClose, IconInfo, IconWarning } from '../icons';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  /** Trailing slot: a retry button, a link. */
  action?: ReactNode;
  /** Renders a close button. Omit for an alert the user must not lose. */
  onDismiss?: () => void;
  /** Replaces the per-tone default. */
  icon?: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'border-info/30 bg-info-soft text-info',
  success: 'border-success/30 bg-success-soft text-success',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  danger: 'border-danger/30 bg-danger-soft text-danger',
};

const TONE_ICONS: Record<AlertTone, ReactNode> = {
  info: <IconInfo size={16} />,
  success: <IconCheck size={16} />,
  warning: <IconWarning size={16} />,
  danger: <IconWarning size={16} />,
};

/**
 * Inline message attached to a region of the page.
 *
 * `role` follows the tone: warnings and errors interrupt, confirmations do not.
 * Body text stays `text-text` while the border, tint and icon carry the tone —
 * coloured paragraphs are hard to read and stop the tone from being the signal.
 */
export function Alert({ tone = 'info', title, children, action, onDismiss, icon, className = '' }: AlertProps) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-card border px-3 py-2.5 ${TONE_CLASSES[tone]} ${className}`}
    >
      <span className="mt-px shrink-0">{icon ?? TONE_ICONS[tone]}</span>

      <div className="min-w-0 flex-1">
        {title !== undefined ? <div className="text-sm font-medium">{title}</div> : null}
        {children !== undefined ? (
          <div className={`text-sm text-text ${title !== undefined ? 'mt-0.5' : ''}`}>{children}</div>
        ) : null}
        {action !== undefined ? <div className="mt-2">{action}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-0.5 shrink-0 rounded-chip p-1 text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
        >
          <IconClose size={14} />
        </button>
      ) : null}
    </div>
  );
}
