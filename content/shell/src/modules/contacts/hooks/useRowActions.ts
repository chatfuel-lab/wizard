import { useCallback } from 'react';
import { useToast, type MenuItem } from '~ui';
import type { Navigate } from '../../types';
import { buildRowMenu } from '../components/list/rowMenu';
import { planBulk, type BulkAction, type BulkPlan, type RowAction } from '../lib/bulk';
import { livechatLink } from '../lib/contactsParams';
import { contactLinkFor } from '../lib/tableSelection';
import { contactName } from '../lib/tableColumns';
import type { ContactRow, TeamMember } from '../types';
import type { BulkRunApi } from './useBulkRun';
import type { RowMutationsApi } from './useRowMutations';

export interface RowActionsArgs {
  mutations: RowMutationsApi;
  bulk: BulkRunApi;
  canEdit: boolean;
  team: TeamMember[];
  onOpenContact: (contactId: string) => void;
  navigate: Navigate;
}

export interface RowActionsApi {
  editRow: (row: ContactRow, action: RowAction) => void;
  runPlan: (next: BulkPlan) => void;
  /** The menu for one row or for the whole selection, same list either way. */
  rowMenuFor: (targets: ContactRow[]) => MenuItem[];
}

/** Everything a row can have done to it: edits, bulk runs, and the row menu. */
export function useRowActions({
  mutations,
  bulk,
  canEdit,
  team,
  onOpenContact,
  navigate,
}: RowActionsArgs): RowActionsApi {
  const toast = useToast();

  /** One cell, edited in place. A failure is a toast beside the row it broke. */
  const editRow = useCallback(
    (row: ContactRow, action: RowAction) => {
      void (async () => {
        const result = await mutations.apply(row, action);
        if (result.ok) return;
        toast.show({
          tone: 'danger',
          title: `Could not update ${contactName(row)}`,
          description: result.message,
        });
      })();
    },
    [mutations, toast],
  );

  const runPlan = useCallback((next: BulkPlan) => void bulk.run(next), [bulk]);

  /** A menu action. One target runs straight away; more than one is a run. */
  const runAction = useCallback(
    (action: BulkAction, targets: ContactRow[]) => runPlan(planBulk(action, targets)),
    [runPlan],
  );

  const copyText = useCallback(
    (text: string, what: string) => {
      void (async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.show({ title: `${what} copied`, description: text });
        } catch {
          /* No clipboard outside a secure context, and the user can refuse it —
             the value goes in the toast either way so it stays selectable. */
          toast.show({ tone: 'warning', title: `Could not copy the ${what.toLowerCase()}`, description: text });
        }
      })();
    },
    [toast],
  );

  const copyLink = useCallback(
    (contactId: string) => copyText(contactLinkFor(window.location.href, contactId), 'Link'),
    [copyText],
  );

  const openLiveChat = useCallback((contactId: string) => navigate(livechatLink(contactId)), [navigate]);

  const rowMenuFor = useCallback(
    (targets: ContactRow[]) =>
      buildRowMenu({
        targets,
        canEdit,
        team,
        onOpen: onOpenContact,
        onLiveChat: openLiveChat,
        onCopy: copyText,
        onLink: copyLink,
        onAction: runAction,
      }),
    [canEdit, team, onOpenContact, openLiveChat, copyText, copyLink, runAction],
  );

  return { editRow, runPlan, rowMenuFor };
}
