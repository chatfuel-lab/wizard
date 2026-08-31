import { useEffect, useId, useState } from 'react';
import { Collapsible, IconChevronDown, Spinner, Tag } from '~ui';
import { useDrafts } from '../../AutomationsDraftContext';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { isSaving } from '../../lib/automationsStore';
import { draftKey } from '../../lib/drafts';
import { inheritanceState } from '../../lib/inheritance';
import { parentShortLabel, settingRow } from '../../lib/settingRows';
import { isKnownSetting } from '../../lib/settingValue';
import type { AutomationRecord, KnownSettingTypename, SettingInfo, SettingOf } from '../../types';
import { editorFor } from '../editors/index';
import type { EditorComponent } from '../editors/types';
import { InheritanceActions, InheritanceChip } from './InheritanceRow';
import { settingIcon } from './settingIcons';

export interface SettingSectionProps {
  automation: AutomationRecord;
  setting: SettingInfo;
  canEdit: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Focus the editor's first control once it mounts (`?setting=` deep link). */
  autoFocus?: boolean;
}

/**
 * The row every setting renders as — on the Default card here and on B2's
 * `RuleCard` (which imports this file). Collapsed: chevron, the setting's
 * glyph, title, the inheritance chip, the right-aligned one-liner, an "Unsaved" tag while its
 * draft is dirty, a spinner while a write is in flight. Expanded: the
 * description, the "values come from Default" note for a following value,
 * the editor from the registry (or the "Managed in the Chatfuel dashboard"
 * line for a typename the module does not edit), then the inheritance
 * actions.
 *
 * The editor is mounted the first time the section opens and STAYS mounted
 * afterwards — collapsing a section with a dirty draft must not throw the
 * draft away, and the drafts registry (⌘S, the badge, the guard) only knows
 * about mounted editors. `Collapsible` renders the panel from outside
 * (`trigger` omitted) because the header here has more slots than its own
 * trigger button offers.
 */
export function SettingSection({
  automation,
  setting,
  canEdit,
  expanded,
  onExpandedChange,
  autoFocus,
}: SettingSectionProps) {
  const { state } = useAutomationRecords();
  const drafts = useDrafts();
  const panelId = useId();
  const row = settingRow(setting);
  const saving = isSaving(state, automation.id, setting.__typename);
  /* The registry hands back the erased type; the section knows the typename is one of the 15. */
  const Editor = isKnownSetting(setting.__typename) ? (editorFor(setting.__typename) as EditorComponent | null) : null;
  const followsParent = inheritanceState(setting) === 'follows' ? setting.inheritsFrom : null;
  const Glyph = settingIcon(setting.__typename);

  /* Mounted once opened, kept afterwards (see above). */
  const [mounted, setMounted] = useState(expanded);
  useEffect(() => {
    if (expanded) setMounted(true);
  }, [expanded]);

  /* The section's own draft — dirty shows a tag on the collapsed header. */
  const key = draftKey(automation.id, setting.__typename);
  const [dirty, setDirty] = useState(() => drafts.dirtyKeys().includes(key));
  useEffect(() => {
    const read = () => setDirty(drafts.dirtyKeys().includes(key));
    read();
    return drafts.subscribe(read);
  }, [drafts, key]);

  return (
    <section data-setting={row.key ?? undefined} className="border-t border-border-subtle first:border-t-0">
      <div className="flex items-center gap-2 py-1.5 pr-1">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onExpandedChange(!expanded)}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-control py-1 text-left transition-colors duration-fast ease-standard hover:text-accent focus-visible:focus-ring @compact:items-center"
        >
          <IconChevronDown
            size={14}
            className={`mt-1 shrink-0 text-text-muted transition-transform duration-fast ease-standard @compact:mt-0 ${expanded ? '' : '-rotate-90'}`}
          />
          <span
            aria-hidden
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-control transition-colors duration-fast ease-standard @compact:mt-0 ${expanded ? 'bg-accent-soft text-accent' : 'bg-surface-sunken text-text-muted'}`}
          >
            <Glyph size={14} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 @compact:flex-row @compact:items-center @compact:gap-3">
            {/* Wraps: a long "Follows <source> default" chip drops under the
                title instead of crushing it at 360px. */}
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-text">{row.title}</span>
              <InheritanceChip setting={setting} />
            </span>
            <span
              className="min-w-0 truncate text-xs text-text-muted @compact:ml-auto @compact:text-right"
              title={row.summary}
            >
              {row.summary}
            </span>
          </span>
        </button>
        {dirty ? <Tag tone="warning">Unsaved</Tag> : null}
        {saving ? <Spinner size={14} className="shrink-0 text-text-muted" /> : null}
      </div>

      <Collapsible open={expanded} onOpenChange={onExpandedChange}>
        <div id={panelId} className="flex flex-col gap-3 pb-4 pl-6 pr-1 pt-1">
          {mounted ? (
            <>
              <p className="text-xs text-text-muted">{row.description}</p>
              {followsParent ? (
                <p className="text-xs italic text-text-faint">
                  Values come from {parentShortLabel(followsParent)} — editing takes ownership for this{' '}
                  {automation.isBase ? 'source' : 'rule'}.
                </p>
              ) : null}
              {Editor ? (
                <Editor
                  automation={automation}
                  setting={setting as SettingOf<KnownSettingTypename>}
                  scope={automation.scope}
                  canEdit={canEdit}
                  autoFocus={autoFocus}
                />
              ) : (
                <p className="text-sm text-text-muted">Managed in the Chatfuel dashboard.</p>
              )}
              <InheritanceActions automation={automation} setting={setting} canEdit={canEdit} busy={saving} />
            </>
          ) : null}
        </div>
      </Collapsible>
    </section>
  );
}
