import { Button, EmptyState, IconWhatsApp } from '~ui';

export interface NoWhatsAppProps {
  /** Where a number gets connected. Null when this deployment has nowhere to send the person. */
  onConnect: (() => void) | null;
}

/**
 * What every surface shows for a bot with no WhatsApp number: a campaign has
 * nothing to go out through, and the template catalog belongs to the number.
 * The one thing to press leads to the channels module when it is installed.
 */
export function NoWhatsApp({ onConnect }: NoWhatsAppProps) {
  return (
    <EmptyState
      icon={<IconWhatsApp />}
      title="No WhatsApp number is connected"
      action={
        onConnect ? (
          <Button variant="primary" onClick={onConnect}>
            Connect WhatsApp
          </Button>
        ) : undefined
      }
    />
  );
}
