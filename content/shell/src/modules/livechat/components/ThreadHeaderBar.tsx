import { Button, DropdownMenu, IconChevronDown, IconUser, ThreadHeader } from '~ui';
import { ConversationStatus, SalesStageV2 } from '~api/generated/livechat/graphql';
import { PLATFORM_LABEL, STATUS_LABEL } from '../lib/platform';
import type { ConversationInfo } from '../types';

export interface ThreadHeaderBarProps {
  conversation: ConversationInfo;
  /** Who the thread is with. */
  name: string;
  canEdit: boolean;
  /** People: View — without it there is no contact toggle. */
  canViewContact: boolean;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  onTakeOver: () => Promise<unknown>;
  closeAs: (stage: SalesStageV2) => Promise<void>;
  onFlowPickerOpenChange: (open: boolean) => void;
}

/** The loaded thread's header row: who this is, and the actions on them. */
export function ThreadHeaderBar({
  conversation,
  name,
  canEdit,
  canViewContact,
  panelOpen,
  onPanelOpenChange,
  onTakeOver,
  closeAs,
  onFlowPickerOpenChange,
}: ThreadHeaderBarProps) {
  return (
    <ThreadHeader
      name={name}
      platform={PLATFORM_LABEL[conversation.platform]}
      status={STATUS_LABEL[conversation.status]}
      /* No `onBack`: `SplitPane` already renders one above this pane
         when the two panes stack, and two back controls in a column is
         worse than none. The prop exists because the layout owner
         decides, and here the layout owner is `LivechatApp`. */
      actions={
        <>
          {conversation.status === ConversationStatus.Automated && canEdit ? (
            <Button size="sm" variant="ghost" onClick={() => void onTakeOver()}>
              Take over
            </Button>
          ) : null}
          {/* "Close", three ways. Won and lost set the contact's stage
              and leave the conversation open; handing over to a flow is
              the only thing that actually closes it, and the picker
              says the rest. One menu, because an operator finishing a
              conversation should not have to know which of those is a
              status and which is a stage before finding the button. */}
          {conversation.status !== ConversationStatus.Closed && canEdit ? (
            <DropdownMenu
              aria-label="Close the conversation"
              items={[
                { id: 'won', label: 'Mark as won', onSelect: () => void closeAs(SalesStageV2.Won) },
                { id: 'lost', label: 'Mark as lost', onSelect: () => void closeAs(SalesStageV2.Lost) },
                { kind: 'separator', id: 'sep' },
                { id: 'flow', label: 'Hand over to a flow…', onSelect: () => onFlowPickerOpenChange(true) },
              ]}
              trigger={(props) => (
                <Button {...props} size="sm" variant="ghost">
                  Close
                  <IconChevronDown size={14} />
                </Button>
              )}
            />
          ) : null}
          {canViewContact ? (
            <Button size="sm" variant="ghost" onClick={() => onPanelOpenChange(!panelOpen)} aria-pressed={panelOpen}>
              <IconUser size={14} />
              Contact
            </Button>
          ) : null}
        </>
      }
    />
  );
}
