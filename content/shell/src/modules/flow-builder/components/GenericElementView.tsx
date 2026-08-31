import { elementRows } from '../lib/elementSummary';
import type { ElementT } from '../types';

const SWITCH_TO_HUMAN = new Set([
  'WidgetSwitchToChatWithHumanAgentBlockElement',
  'WhatsAppSwitchToChatWithHumanAgentBlockElement',
  'InstagramSwitchToChatWithHumanAgentBlockElement',
  'TikTokSwitchToChatWithHumanAgentBlockElement',
]);

/**
 * Read-only view for the element types the API exposes no setters for
 * (widget entry point, the switch-to-human quartet) — and the crash-proof
 * fallback for typenames this bundle has never heard of.
 */
export function GenericElementView({ element }: { element: ElementT }) {
  const rows = elementRows(element);
  if (rows.length === 0) {
    return (
      <p className="text-xs text-text-muted">
        {SWITCH_TO_HUMAN.has(element.__typename)
          ? 'Nothing to configure — this card hands the chat to a human agent.'
          : 'This element type has no editable fields in the API.'}
      </p>
    );
  }
  return (
    <dl className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`}>
          <dt className="text-xs font-medium text-text-muted">{row.label}</dt>
          <dd className="break-words text-sm text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
