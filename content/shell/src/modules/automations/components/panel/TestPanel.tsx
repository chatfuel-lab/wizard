import { useMemo } from 'react';
import { Alert, Button, EmptyState, IconPlay, IconRefresh, IconSparkles, Select, TestChat, Tooltip } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { usePreviewSession } from '../../hooks/usePreviewSession';
import { selectBase, selectCustoms } from '../../lib/automationsStore';
import { platformOfScope, type PreviewTarget } from '../../lib/preview';
import { platformOf, scopeLabel } from '../../lib/scopes';
import { PlatformGlyph } from './PlatformGlyph';

export interface TestPanelProps {
  /** The selected source. */
  scope: FuelyAutomationScope;
  /** The automation the session is pinned to — the source's Default or one of its rules; null while the store has no base yet. */
  automationId: string | null;
  /** The reader picked another automation of this source in the header. */
  onPick: (automationId: string) => void;
}

/**
 * The Test panel — the test chat that is ALWAYS beside the scope page, pinned
 * to ONE automation via `previewResponsesStartForFuelyAutomation`: the
 * source's Default by default, the rule the reader last opened otherwise, and
 * a `Select` in the header to pick any of them by hand. The header names the
 * target and shows the platform glyph, the "routing is not emulated" note,
 * thread + composer, Restart. Default (All) is not previewable — the panel
 * says so and offers a source instead. Mounted by the workspace only for
 * `Ai: Edit` roles.
 */
export function TestPanel({ scope, automationId, onPick }: TestPanelProps) {
  const store = useAutomationRecords();
  const catalog = useCatalog();
  const isAll = scope === FuelyAutomationScope.All;
  const record = automationId ? (store.state.byId[automationId] ?? null) : null;
  const target = useMemo<PreviewTarget | null>(
    () => (record && !isAll ? { kind: 'automation', id: record.id } : null),
    [record, isAll],
  );
  const preview = usePreviewSession(target);

  const base = selectBase(store.state, scope);
  const customs = selectCustoms(store.state, scope);
  const options = useMemo(
    () =>
      base
        ? [
            { value: base.id, label: 'Default rules' },
            ...customs.map((rule) => ({ value: rule.id, label: rule.name ?? 'Untitled rule' })),
          ]
        : [],
    [base, customs],
  );

  const platform = preview.platform ?? (isAll ? null : platformOfScope(scope));
  const scopePlatform = isAll ? null : platformOf(scope);
  const connected = scopePlatform
    ? (catalog.channels.find((c) => c.platform === scopePlatform)?.connected ?? true)
    : true;
  const title = isAll ? 'Default · All channels' : scopeLabel(scope);

  const header = (
    <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-2.5">
      <div className="flex items-start gap-2">
        {platform ? <PlatformGlyph platform={platform} badge on={record?.enabled} className="mt-0.5" /> : null}
        <div className="min-w-0 flex-1">
          <div className="text-micro font-semibold tracking-wide text-text-faint uppercase">Test</div>
          <div className="truncate text-sm font-medium text-text" title={title}>
            {title}
          </div>
        </div>
        {preview.session ? (
          <Tooltip label="Restart the test — a fresh conversation">
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Restart the test"
              onClick={preview.restart}
              disabled={preview.status === 'starting'}
              data-automations-preview-restart
            >
              <IconRefresh size={14} />
            </Button>
          </Tooltip>
        ) : null}
      </div>
      {!isAll && options.length > 1 && automationId ? (
        <Select
          aria-label="What to test on this source"
          value={automationId}
          onChange={onPick}
          options={options}
          className="w-full"
        />
      ) : null}
    </div>
  );

  if (isAll) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {header}
        <EmptyState
          icon={<IconPlay />}
          title="Default cannot be tested on its own"
          description="Default is what every source starts from — open a source (Instagram · Direct messages, WhatsApp · Direct messages, …) and its Default rules can be tested there."
        />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {header}
        <EmptyState
          icon={<IconSparkles />}
          title={store.state.loaded ? 'That automation is gone' : 'Loading…'}
          description={
            store.state.loaded
              ? 'It may have been deleted in another tab. Pick another rule above, or the Default rules.'
              : undefined
          }
        />
      </div>
    );
  }

  const alerts = (
    <>
      {!record.enabled ? (
        <Alert tone="warning">
          {record.isBase ? 'This source is off' : 'This rule is off'} — the test still answers, customers would not get
          this.
        </Alert>
      ) : null}
      {!connected && scopePlatform ? (
        <Alert tone="info">{scopePlatform} is not connected — the test answers, no customer can reach it yet.</Alert>
      ) : null}
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {header}
      <TestChat
        status={preview.status}
        rows={preview.rows}
        typing={preview.typing}
        error={preview.error}
        threadError={preview.threadError}
        threadLoading={preview.threadLoading}
        threadKey={preview.session?.conversationID ?? `idle:${record.id}`}
        botName="AI"
        canSend={preview.canSend}
        onSend={preview.send}
        onStart={preview.start}
        canStart
        emptyTitle="Start a test conversation"
        alerts={alerts}
        compact
        disabledHint={preview.sendBlocked ?? undefined}
      />
    </div>
  );
}
