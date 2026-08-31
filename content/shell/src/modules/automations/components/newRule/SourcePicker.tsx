import { useMemo, type ReactElement } from 'react';
import {
  Combobox,
  IconFacebook,
  IconInstagram,
  IconTikTok,
  IconWhatsApp,
  IconWidget,
  Tag,
  type ComboboxOption,
} from '~ui';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { ChannelConnection } from '../../hooks/useBootstrap';
import { RULES_PER_SCOPE, type SourceOption } from '../../lib/newRule';
import { PLATFORM_KEYS, scopeDescription, scopeShortLabel, type Platform, type PlatformKey } from '../../lib/scopes';

const GLYPHS: Record<PlatformKey, (props: { size?: number; className?: string }) => ReactElement> = {
  instagram: IconInstagram,
  whatsapp: IconWhatsApp,
  facebook: IconFacebook,
  tiktok: IconTikTok,
  widget: IconWidget,
};

/* Written out in full so Tailwind sees every class — a template string would generate none of them. */
const TINTS: Record<PlatformKey, string> = {
  instagram: 'bg-channel-instagram-soft text-channel-instagram',
  whatsapp: 'bg-channel-whatsapp-soft text-channel-whatsapp',
  facebook: 'bg-channel-facebook-soft text-channel-facebook',
  tiktok: 'bg-channel-tiktok-soft text-channel-tiktok',
  widget: 'bg-channel-widget-soft text-channel-widget',
};

export function PlatformGlyph({
  platform,
  size = 14,
  className = '',
}: {
  platform: Platform;
  size?: number;
  className?: string;
}) {
  const key = PLATFORM_KEYS[platform];
  const Icon = GLYPHS[key];
  return (
    <span className={`inline-flex items-center justify-center rounded-full ${TINTS[key]} ${className}`} aria-hidden>
      <Icon size={size} />
    </span>
  );
}

const connectionText = (c: ChannelConnection | undefined): string =>
  c?.connected ? (c.handle ?? 'Connected') : c?.platform === 'Web Widget' ? 'Widget off' : 'Not connected';

export interface SourcePickerProps {
  value: FuelyAutomationScope | null;
  onChange: (scope: FuelyAutomationScope) => void;
  options: readonly SourceOption[];
  disabled?: boolean;
}

/**
 * The source (scope) a new rule is created in: a `Combobox` over the sources
 * that accept rules — grouped by platform through the label ("Instagram ·
 * Post comments"), each with the glyph, its connection state ("Not connected"
 * muted but still selectable — a rule can be prepared before the channel is)
 * and "n / 30 rules". Under it, the chosen source's one-line description.
 */
export function SourcePicker({ value, onChange, options, disabled = false }: SourcePickerProps) {
  const comboOptions = useMemo<ComboboxOption[]>(
    () =>
      options.map((o) => {
        const full = o.rules >= RULES_PER_SCOPE;
        return {
          value: o.scope,
          label: `${o.platform} · ${scopeShortLabel(o.scope)}`,
          description: `${connectionText(o.connection)} · ${o.rules} / ${RULES_PER_SCOPE} rules${full ? ' — limit reached' : ''}`,
          keywords: [o.platform, scopeShortLabel(o.scope), scopeDescription(o.scope)],
          icon: <PlatformGlyph platform={o.platform} size={12} className="h-5 w-5" />,
          disabled: full,
        };
      }),
    [options],
  );
  const chosen = options.find((o) => o.scope === value) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <Combobox
        value={value}
        onChange={(next) => next && onChange(next as FuelyAutomationScope)}
        options={comboOptions}
        placeholder="Pick a source…"
        disabled={disabled}
        aria-label="Source"
        empty="No source matches"
      />
      {chosen ? (
        <div className="flex items-start gap-2 rounded-control bg-surface-sunken px-2.5 py-2 text-xs">
          <PlatformGlyph platform={chosen.platform} size={12} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-text">{scopeDescription(chosen.scope)}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-text-muted">
              {chosen.connection?.connected ? (
                <Tag tone="success">{chosen.connection.handle ?? 'Connected'}</Tag>
              ) : (
                <Tag>{connectionText(chosen.connection)}</Tag>
              )}
              <span>
                {chosen.rules} / {RULES_PER_SCOPE} rules
              </span>
            </div>
            {!chosen.connection?.connected ? (
              <p className="mt-1 text-text-faint">
                The rule can be set up now; it starts catching conversations once the channel is connected.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
