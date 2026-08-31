import { Alert, Button } from '~ui';
import type { BookingsParams } from '../../lib/bookingsParams';

export interface CalendarAlertsProps {
  /** Catalog loaded and missing a service or a specialist. */
  catalogEmpty: boolean;
  /** A refresh that failed while the last loaded window still shows; null otherwise. */
  refreshError: string | null;
  onParams: (patch: Partial<BookingsParams>) => void;
  onDismissError: () => void;
  onRetry: () => void;
}

/**
 * The banners above the surface. An empty catalog is said here rather than by
 * a broken wizard later; a failed refresh is dismissible because the grid
 * still shows the last loaded window (the initial-load error is the surface's
 * own, full-height state).
 */
export function CalendarAlerts({ catalogEmpty, refreshError, onParams, onDismissError, onRetry }: CalendarAlertsProps) {
  return (
    <>
      {catalogEmpty ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="info"
            title="Add a service and a specialist to start booking"
            action={
              <span className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => onParams({ view: 'services' })}>
                  Services
                </Button>
                <Button variant="outline" size="sm" onClick={() => onParams({ view: 'staff' })}>
                  Staff
                </Button>
              </span>
            }
          >
            The wizard needs at least one service and one specialist with working hours; the grid still shows what
            exists.
          </Alert>
        </div>
      ) : null}
      {refreshError ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="danger"
            title="Refresh failed — showing the last loaded bookings"
            onDismiss={onDismissError}
            action={
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            }
          >
            {refreshError}
          </Alert>
        </div>
      ) : null}
    </>
  );
}
