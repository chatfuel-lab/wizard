import { Button, Card, IconExternal, openExternal, safeHref } from '~ui';
import { useSettings } from '../../BookingsSettingsContext';
import { CopyButton } from '../staff/CopyButton';

/**
 * The customer-facing booking page URL, when the bot has one. Read-only:
 * Chatfuel provisions it; this workspace only shows it and copies it. There
 * is no public booking page built here on purpose — it would need the bot
 * token in the browser (see the handoff).
 */
export function BookingPageSection() {
  const settings = useSettings();
  const url = settings.state.config?.calendarLandingURL ?? null;
  /* Chatfuel provisions this address and it arrives with the config, so it
     goes through `safeHref` before it becomes a link. Refused, the address is
     still shown and still copyable — it is the navigation that is dropped, not
     the fact that the bot has one. */
  const href = url ? safeHref(url) : null;
  return (
    <Card
      title="Booking page"
      description="Chatfuel’s hosted page where customers book on their own. Provided by Chatfuel; not editable here."
    >
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 truncate rounded-chip bg-surface-sunken px-2 py-1 font-mono text-xs text-accent focus-visible:focus-ring"
            >
              {url}
            </a>
          ) : (
            <span className="min-w-0 truncate rounded-chip bg-surface-sunken px-2 py-1 font-mono text-xs text-text-muted">
              {url}
            </span>
          )}
          <CopyButton value={url} label="Copy URL" />
          <Button variant="ghost" size="xs" onClick={() => openExternal(url)}>
            <IconExternal size={14} /> Open
          </Button>
        </div>
      ) : (
        <p className="text-sm text-text-muted">No booking page URL is set on this bot.</p>
      )}
    </Card>
  );
}
