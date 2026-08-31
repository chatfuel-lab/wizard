/**
 * What the ⌘K palette offers, as data.
 *
 * **Workspace-scoped on purpose** (deals' rule): every command acts on state
 * `KnowledgeBaseWorkspace` already owns — the selected source, the pending
 * undo, the drafts, the import wizard. Nothing reaches into a row.
 *
 * Pure, so "which commands appear in which state" is a test. Icons come in as
 * a map from the component.
 */
import type { ReactNode } from 'react';
import type { CommandGroup, CommandItem } from '~ui';
import { SOURCES, sourceMeta, type SourceId } from './sources';

export type KnowledgeCommandId =
  'new' | 'import' | 'export' | 'undo' | 'save' | 'search' | 'refresh' | 'shortcuts' | 'scan' | 'source';

export interface KnowledgeSourceSummary {
  id: SourceId;
  /** Items in the source, or null where a count makes no sense (Overview). */
  count: number | null;
  /** Characters this source spends, or null when it spends none. */
  chars: number | null;
  /** Findings the lint raised on this source. */
  issues: number;
}

export interface KnowledgeCommandContext {
  source: SourceId;
  /** What "n" would add here — null when the source creates nothing. */
  createLabel: string | null;
  /** What "i"/"e" act on — null when the source has no import/export. */
  transferLabel: string | null;
  undoLabel: string | null;
  dirtyCount: number;
  canEdit: boolean;
  canReadInbox: boolean;
  sources: readonly KnowledgeSourceSummary[];
}

export interface KnowledgeCommandHandlers {
  goSource: (source: SourceId) => void;
  create: () => void;
  openImport: () => void;
  exportSource: () => void;
  undo: () => void;
  saveAll: () => void;
  focusSearch: () => void;
  refresh: () => void;
  openShortcuts: () => void;
  scanGaps: () => void;
}

export type KnowledgeCommandIcons = Partial<Record<KnowledgeCommandId, ReactNode>>;

/** "12 entries · 2 to fix" — the description under a source row. */
export function sourceDescription(summary: KnowledgeSourceSummary): string | undefined {
  const bits: string[] = [];
  if (summary.count !== null) bits.push(summary.count === 1 ? '1 entry' : `${summary.count} entries`);
  if (summary.issues > 0) bits.push(summary.issues === 1 ? '1 to fix' : `${summary.issues} to fix`);
  return bits.length > 0 ? bits.join(' · ') : undefined;
}

export function buildCommandGroups(
  context: KnowledgeCommandContext,
  handlers: KnowledgeCommandHandlers,
  icons: KnowledgeCommandIcons = {},
): CommandGroup[] {
  const actions: CommandItem[] = [];

  if (context.canEdit && context.createLabel !== null) {
    actions.push({
      id: 'new',
      label: context.createLabel,
      keywords: ['create', 'add', 'new'],
      shortcut: ['n'],
      icon: icons.new,
      onSelect: handlers.create,
    });
  }
  if (context.canEdit && context.transferLabel !== null) {
    actions.push({
      id: 'import',
      label: `Import ${context.transferLabel}`,
      description: 'A file or pasted text',
      keywords: ['csv', 'upload', 'paste'],
      shortcut: ['i'],
      icon: icons.import,
      onSelect: handlers.openImport,
    });
  }
  if (context.transferLabel !== null) {
    actions.push({
      id: 'export',
      label: `Export ${context.transferLabel}`,
      keywords: ['csv', 'json', 'download', 'backup'],
      shortcut: ['e'],
      icon: icons.export,
      onSelect: handlers.exportSource,
    });
  }
  if (context.undoLabel !== null) {
    actions.push({
      id: 'undo',
      label: context.undoLabel,
      keywords: ['revert', 'back', 'mistake'],
      shortcut: ['mod', 'z'],
      icon: icons.undo,
      onSelect: handlers.undo,
    });
  }
  if (context.dirtyCount > 0) {
    actions.push({
      id: 'save',
      label: context.dirtyCount === 1 ? 'Save the unsaved change' : `Save ${context.dirtyCount} unsaved changes`,
      keywords: ['drafts', 'unsaved', 'commit'],
      shortcut: ['mod', 's'],
      icon: icons.save,
      onSelect: handlers.saveAll,
    });
  }
  if (context.canReadInbox) {
    actions.push({
      id: 'scan',
      label: 'Scan conversations for gaps',
      description: 'Questions the assistant handed to a human',
      keywords: ['unanswered', 'unresolved', 'missing', 'coverage', 'handover'],
      icon: icons.scan,
      onSelect: handlers.scanGaps,
    });
  }
  actions.push({
    id: 'search',
    label: 'Search',
    keywords: ['find', 'filter'],
    shortcut: ['/'],
    icon: icons.search,
    onSelect: handlers.focusSearch,
  });
  actions.push({
    id: 'refresh',
    label: 'Refresh',
    keywords: ['reload', 'refetch'],
    shortcut: ['r'],
    icon: icons.refresh,
    onSelect: handlers.refresh,
  });
  actions.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: ['?'],
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });

  const summaries = new Map(context.sources.map((summary) => [summary.id, summary]));
  const sourceItems: CommandItem[] = SOURCES.filter((meta) => meta.id !== context.source)
    .filter((meta) => !meta.needsInbox || context.canReadInbox)
    .map((meta) => {
      const summary = summaries.get(meta.id);
      return {
        id: `source.${meta.id}`,
        label: meta.label,
        description: (summary ? sourceDescription(summary) : undefined) ?? meta.blurb,
        keywords: [meta.group, meta.title, meta.blurb, 'source', meta.ownedBy ?? ''].filter(Boolean),
        icon: icons.source,
        onSelect: () => handlers.goSource(meta.id),
      };
    });

  return [
    { id: 'actions', label: 'Actions', items: actions },
    { id: 'sources', label: 'Open a source', items: sourceItems },
  ];
}

/** What `n` creates on each source, for the palette label and the header button. */
export function createLabelFor(source: SourceId, canEditHere: boolean): string | null {
  if (!canEditHere) return null;
  switch (source) {
    case 'faq':
      return 'Add an FAQ';
    case 'products':
      return 'Add a product';
    case 'services':
      return 'Add a service';
    case 'team':
      return 'Add a specialist';
    default:
      return null;
  }
}

/** What `i` / `e` move on each source. */
export function transferLabelFor(source: SourceId): string | null {
  switch (source) {
    case 'faq':
      return 'FAQs';
    case 'products':
      return 'products';
    default:
      return null;
  }
}

export const ownerLabelFor = (source: SourceId): string | null => {
  const meta = sourceMeta(source);
  return meta.ownedBy
    ? `Edit ${meta.label.toLocaleLowerCase()} in ${meta.ownedBy === 'bookings' ? 'Bookings' : meta.ownedBy}`
    : null;
};
