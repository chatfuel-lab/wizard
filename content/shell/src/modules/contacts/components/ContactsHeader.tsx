import { Button, IconRefresh, Kbd, PageHeader, Spinner, Tabs } from '~ui';
import type { ContactsView } from '../lib/contactsParams';

const VIEW_TABS: { id: ContactsView; label: string }[] = [
  { id: 'list', label: 'Contacts' },
  { id: 'fields', label: 'Fields' },
  { id: 'audience', label: 'Audience' },
];

export interface ContactsHeaderProps {
  /** The headline count the active view reported; null while it loads. */
  count: { shown: number; server: number | null } | null;
  busy: boolean;
  view: ContactsView;
  onSelectView: (view: ContactsView) => void;
  onOpenPalette: () => void;
  onRefresh: () => void;
}

/** The module's page header: title, count, the ⌘K button and the surface tabs. */
export function ContactsHeader({ count, busy, view, onSelectView, onOpenPalette, onRefresh }: ContactsHeaderProps) {
  return (
    <PageHeader
      title="Contacts"
      meta={
        <span className="flex items-center gap-2 text-meta text-text-muted">
          {count ? (
            <span>
              {count.shown.toLocaleString()}
              {count.server !== null && count.server !== count.shown ? ` of ${count.server.toLocaleString()}` : ''}
            </span>
          ) : null}
          {busy ? <Spinner /> : null}
        </span>
      }
      actions={
        <>
          {/* Hidden in the smallest band: ⌘K is not a phone control, and
              every other way in still works. */}
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open the command palette"
            className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-meta text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
          >
            Commands
            <Kbd keys={['mod', 'k']} />
          </button>
          <Button variant="ghost" size="sm" iconOnly onClick={onRefresh} aria-label="Refresh">
            <IconRefresh />
          </Button>
        </>
      }
      tabs={
        <Tabs
          tabs={VIEW_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
          active={view}
          onSelect={(next) => onSelectView(next as ContactsView)}
        />
      }
    />
  );
}
