import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      {icon ? <div className="text-text-faint [&_svg]:h-10 [&_svg]:w-10">{icon}</div> : null}
      <div className="text-sm font-medium text-text">{title}</div>
      {description ? <div className="max-w-sm text-sm text-text-muted">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
