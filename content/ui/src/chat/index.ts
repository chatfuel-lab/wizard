export { MessageBubble, type MessageBubbleProps } from './MessageBubble';
export { MessageActions, type MessageAction, type MessageActionsProps } from './MessageActions';
/* `MessageStatus` is deliberately two things under one name — the status union
 * in a type position, the glyph component in a value position. They are
 * declared in one module, which is what lets a single re-export carry both;
 * the union has been the exported vocabulary from the start and did not have to be
 * renamed to make room for the component. */
export { MessageStatus, type MessageStatusProps } from './MessageStatus';
export { Composer, type ComposerApi, type ComposerProps } from './Composer';
export { SystemLine } from './SystemLine';
export { TypingIndicator } from './TypingIndicator';
export { MessageList, type MessageListApi, type MessageListProps } from './MessageList';
export {
  ConversationListItem,
  type ConversationAssignee,
  type ConversationListItemProps,
} from './ConversationListItem';
export { AttachmentTile, type AttachmentKind, type AttachmentState, type AttachmentTileProps } from './AttachmentTile';
export { AttachmentGallery, type AttachmentGalleryProps, type GalleryItem } from './AttachmentGallery';
export { ThreadHeader, type ThreadHeaderProps } from './ThreadHeader';
export { TestChat, type TestChatProps } from './TestChat';

/* The assistant half of the chat kit: what the model is doing, as opposed to
 * what it said. A tool call is a step, consecutive steps are a run, and text
 * that is still arriving is a stream with a caret on the end of it. */
export { RunStep, TOOL_FAMILY_ICONS, type RunStepProps } from './RunStep';
export { RunGroup, type RunGroupProps } from './RunGroup';
export { StreamingText, type StreamingTextProps } from './StreamingText';
export { VoiceRecorder, type VoiceClip, type VoiceRecorderProps } from './VoiceRecorder';
