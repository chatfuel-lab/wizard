import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Collapsible,
  DropdownMenu,
  IconChevronDown,
  IconCopy,
  IconMore,
  IconTrash,
  Switch,
  Tag,
  type MenuItem,
} from '~ui';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { useAutomationMutations } from '../../hooks/useAutomationMutations';
import { useComposites } from '../../hooks/useComposites';
import { typenameOfKey, type SettingKey } from '../../lib/automationsParams';
import { summarizeReplies, summarizeTriggers } from '../../lib/ruleSummary';
import { filterSettingsFor, groupSettings } from '../../lib/scopes';
import { settingOf } from '../../lib/settingValue';
import type { AutomationRecord, SettingInfo, SettingTypename } from '../../types';
import { SettingSection } from '../channels/SettingSection';
import { DeleteRuleDialog, DuplicateRuleDialog } from './RuleDialogs';
import { RuleName } from './RuleName';

export interface RuleCardProps {
  automation: AutomationRecord;
  canEdit: boolean;
  /** Expanded on arrival (`?automation=`), and the section to open (`?setting=`). */
  expanded?: boolean;
  focusSetting?: string | null;
  /** The card was expanded or collapsed — the Test panel follows the last opened one. */
  onOpenChange?: (automationId: string, open: boolean) => void;
}

/**
 * One custom rule. Header: the name (inline rename), the enabled switch, the
 * trigger and reply summaries, and the overflow menu (Duplicate, Delete).
 * Body: the **Triggers** group first (the filter settings only a rule owns),
 * then the behaviour groups, every setting a `SettingSection` — its chip
 * reads "Follows <source> default" / "Follows Default". Expanding the card
 * tells the workspace, so the Test panel beside the page pins to this rule.
 */
export function RuleCard({ automation, canEdit, expanded = false, focusSetting = null, onOpenChange }: RuleCardProps) {
  const mutations = useAutomationMutations();
  const composites = useComposites();
  const { state } = useAutomationRecords();

  const [open, setOpen] = useState(expanded || focusSetting !== null);
  /* Tell the workspace on every CHANGE of `open`, not on mount: the deep-linked
     card is already the workspace's focus (it seeded it from `?automation=`). */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onOpenChange?.(automation.id, open);
  }, [open, automation.id, onOpenChange]);
  const [sections, setSections] = useState<ReadonlySet<SettingTypename>>(
    () => new Set(focusSetting ? [typenameOfKey(focusSetting as SettingKey) as SettingTypename] : []),
  );
  const [autoFocusTypename, setAutoFocusTypename] = useState<SettingTypename | null>(
    focusSetting ? (typenameOfKey(focusSetting as SettingKey) as SettingTypename) : null,
  );
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  // A late `?automation=` / `?setting=` (data landed after mount) still opens the card and the section.
  useEffect(() => {
    if (expanded || focusSetting) setOpen(true);
    if (focusSetting) {
      const typename = typenameOfKey(focusSetting as SettingKey) as SettingTypename;
      setSections((prev) => (prev.has(typename) ? prev : new Set([...prev, typename])));
      setAutoFocusTypename(typename);
    }
  }, [expanded, focusSetting]);

  // Scroll into view once on arrival — never on a live update.
  useEffect(() => {
    if (!expanded || scrolled.current) return;
    scrolled.current = true;
    const node = rootRef.current;
    if (!node) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [expanded]);

  const toggleSection = useCallback((typename: SettingTypename, next: boolean) => {
    setSections((prev) => {
      const out = new Set(prev);
      if (next) out.add(typename);
      else out.delete(typename);
      return out;
    });
  }, []);

  const triggerLine = useMemo(() => summarizeTriggers(automation), [automation]);
  const replyLine = useMemo(() => summarizeReplies(automation), [automation]);

  const triggerSettings = useMemo(
    () =>
      filterSettingsFor(automation.scope)
        .map((typename) => settingOf(automation.settings, typename))
        .filter((s): s is SettingInfo => Boolean(s)),
    [automation],
  );
  const behaviourGroups = useMemo(
    () =>
      groupSettings(automation.settings)
        .filter((entry) => entry.group.id !== 'triggers')
        .map((entry) => ({
          ...entry,
          records: entry.settings
            .map((t) => settingOf(automation.settings, t))
            .filter((s): s is SettingInfo => Boolean(s)),
        })),
    [automation],
  );

  const flashing = Boolean(state.flash[automation.id]);

  const menuItems: MenuItem[] = [
    ...(canEdit
      ? [
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <IconCopy size={14} />,
            onSelect: () => setDuplicating(true),
          } satisfies MenuItem,
        ]
      : []),
    ...(canEdit
      ? [
          { kind: 'separator', id: 'sep' } satisfies MenuItem,
          {
            id: 'delete',
            label: 'Delete',
            icon: <IconTrash size={14} />,
            tone: 'danger',
            onSelect: () => setDeleting(true),
          } satisfies MenuItem,
        ]
      : []),
  ];

  const header = (
    <div className="flex items-start gap-2 px-4 py-3 @compact:gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Collapse rule' : 'Expand rule'}
        onClick={() => setOpen((v) => !v)}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
      >
        <IconChevronDown
          size={14}
          className={`transition-transform duration-fast ease-standard ${open ? '' : '-rotate-90'}`}
        />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <RuleName
            name={automation.name ?? 'Rule'}
            canEdit={canEdit}
            onRename={(next) => mutations.rename(automation, next)}
            className="min-w-0"
          />
          {!automation.enabled ? <Tag>Off</Tag> : null}
        </div>
        <p className="truncate text-xs text-text-muted" title={triggerLine}>
          {triggerLine}
        </p>
        {replyLine ? (
          <p className="truncate text-xs text-text-faint" title={replyLine}>
            {replyLine}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 @compact:gap-1">
        <Switch
          checked={automation.enabled}
          onChange={(next) => void mutations.setEnabled(automation, next)}
          aria-label={`“${automation.name ?? 'Rule'}” is ${automation.enabled ? 'on' : 'off'}`}
          disabled={!canEdit}
        />
        {menuItems.length > 0 ? (
          <DropdownMenu
            items={menuItems}
            aria-label={`Actions for ${automation.name ?? 'rule'}`}
            trigger={(props) => (
              <Button
                {...props}
                iconOnly
                variant="ghost"
                size="sm"
                aria-label={`Actions for ${automation.name ?? 'rule'}`}
              >
                <IconMore size={16} />
              </Button>
            )}
          />
        ) : null}
      </div>
    </div>
  );

  const body = (
    <div className={`flex flex-col gap-4 border-t border-border px-3 py-3 @compact:px-4`}>
      {triggerSettings.length > 0 ? (
        <SettingGroup label="Triggers" hint="What a comment or message must look like to land here">
          {triggerSettings.map((setting) => (
            <SettingSection
              key={setting.__typename}
              automation={automation}
              setting={setting}
              canEdit={canEdit}
              expanded={sections.has(setting.__typename)}
              onExpandedChange={(next) => toggleSection(setting.__typename, next)}
              autoFocus={autoFocusTypename === setting.__typename}
            />
          ))}
        </SettingGroup>
      ) : null}
      {behaviourGroups.map((entry) => (
        <SettingGroup key={entry.group.id} label={entry.group.label}>
          {entry.records.map((setting) => (
            <SettingSection
              key={setting.__typename}
              automation={automation}
              setting={setting}
              canEdit={canEdit}
              expanded={sections.has(setting.__typename)}
              onExpandedChange={(next) => toggleSection(setting.__typename, next)}
              autoFocus={autoFocusTypename === setting.__typename}
            />
          ))}
        </SettingGroup>
      ))}
    </div>
  );

  const dialogs = (
    <>
      <DuplicateRuleDialog
        open={duplicating}
        source={automation}
        onClose={() => setDuplicating(false)}
        onDuplicate={async (name) => {
          const report = await composites.duplicate(automation, name);
          if (report.aborted) throw new Error(report.message ?? 'Could not duplicate the rule.');
        }}
      />
      <DeleteRuleDialog
        open={deleting}
        rule={automation}
        onClose={() => setDeleting(false)}
        onDelete={async () => {
          // The hook toasts its own failure; either way the dialog closes.
          await mutations.remove(automation);
        }}
      />
    </>
  );

  return (
    <div ref={rootRef} data-automation-id={automation.id} className="scroll-mt-4">
      <Card
        padded={false}
        className={`transition-shadow duration-fast ease-standard ${expanded ? 'ring-1 ring-accent' : ''} ${flashing ? 'ring-1 ring-danger' : ''} ${automation.enabled ? '' : 'opacity-90'}`}
      >
        {header}
        <Collapsible open={open} onOpenChange={setOpen}>
          {body}
        </Collapsible>
      </Card>
      {dialogs}
    </div>
  );
}

function SettingGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2 px-1">
        <h4 className="text-micro font-semibold uppercase tracking-wide text-text-faint">{label}</h4>
        {hint ? <span className="hidden truncate text-micro text-text-faint @compact:inline">{hint}</span> : null}
      </div>
      <div className="flex flex-col divide-y divide-border rounded-card border border-border-subtle bg-surface-sunken/40 px-2">
        {children}
      </div>
    </section>
  );
}
