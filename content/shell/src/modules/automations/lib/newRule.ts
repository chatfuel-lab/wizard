/**
 * What the New-rule dialog decides before anything is created: which sources
 * accept rules, and which one to preselect. Pure; the components render it.
 */
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { ChannelConnection } from '../hooks/useBootstrap';
import { SCOPE_GROUPS, allowsCustomAutomations, platformOf, type Platform } from './scopes';

/** The API's per-source ceiling (`FuelyAutomationScopeLimitReached`). */
export const RULES_PER_SCOPE = 30;

export interface SourceOption {
  scope: FuelyAutomationScope;
  platform: Platform;
  connection: ChannelConnection | undefined;
  rules: number;
}

/** The sources that accept rules, in nav order, with what the dialog shows about each. */
export function sourceOptions(channels: readonly ChannelConnection[], customs: Record<string, number>): SourceOption[] {
  return SCOPE_GROUPS.flatMap((group) =>
    group.scopes.filter(allowsCustomAutomations).map((scope) => ({
      scope,
      platform: group.platform,
      connection: channels.find((c) => c.platform === group.platform),
      rules: customs[scope] ?? 0,
    })),
  );
}

/** A scope that accepts rules near the one asked for: itself, else its platform's first, else the first overall. */
export function nearestSource(
  wanted: FuelyAutomationScope | null,
  options: readonly SourceOption[],
): FuelyAutomationScope | null {
  if (options.length === 0) return null;
  if (wanted && options.some((o) => o.scope === wanted)) return wanted;
  const platform = wanted ? platformOf(wanted) : null;
  return options.find((o) => o.platform === platform)?.scope ?? options[0]!.scope;
}
