import { Alert, Button, IconExternal, openExternal } from '~ui';
import type { DeliveryState } from '../hooks/useCatalogStore';

/** Where a person goes to connect a number or re-grant the permission. */
const CHATFUEL = 'https://panel.chatfuel.com';

interface Copy {
  title: string;
  body: string;
}

/*
 * Only the states that stop delivery say anything. A working connection is not
 * news, and "unknown" means the connection query itself failed — which the
 * store's own error already reports.
 */
const COPY: Partial<Record<DeliveryState, Copy>> = {
  noWhatsApp: {
    title: 'No WhatsApp number connected',
    body: 'Conversions are reported for a click-to-WhatsApp conversation, so nothing set up here is sent until a number is connected.',
  },
  noPermission: {
    title: 'Meta has not granted conversion access',
    body: 'The connected number is missing the permission that lets conversions be reported. Reconnect it in Chatfuel to grant it.',
  },
  accessLost: {
    title: 'This WhatsApp number is no longer reachable',
    body: 'Access to the number was withdrawn on Meta’s side. Reconnect it in Chatfuel to start reporting again.',
  },
};

/**
 * The one thing on this surface that is not a setting: whether any of it is
 * delivered.
 *
 * It is an alert rather than a note under the events table, because it is
 * actionable and because it is only true sometimes. The action leaves for
 * Chatfuel: granting Meta permission is an interactive consent this app cannot
 * run on somebody's behalf.
 */
export function DeliveryAlert({ state }: { state: DeliveryState }) {
  const copy = COPY[state];
  if (!copy) return null;

  return (
    <Alert
      tone="warning"
      title={copy.title}
      action={
        <Button variant="secondary" size="sm" onClick={() => openExternal(CHATFUEL)}>
          Open Chatfuel
          <IconExternal size={14} />
        </Button>
      }
    >
      {copy.body}
    </Alert>
  );
}
