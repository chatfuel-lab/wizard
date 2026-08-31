export {
  activationExceeded,
  autoScrollVelocity,
  hitTest,
  layerOrigin,
  nearestTarget,
  resolveTarget,
  type DropTarget,
  type Point,
} from './geometry/dragGeometry';

/* Canvas maths. The components that consume it land next; these are exported
   now because they are the half a module can already use — a minimap, a
   "fit to content" button and an edge hit test are all pure arithmetic. */
export {
  IDENTITY_VIEWPORT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  alignmentGuides,
  boundsOf,
  clampZoom,
  fitToBounds,
  isRectVisible,
  marqueeHits,
  panBy,
  readyToFit,
  rectFromPoints,
  screenToWorld,
  snapToGrid,
  worldToScreen,
  zoomAt,
  zoomBy,
  type AlignmentGuide,
  type AlignmentResult,
  type CanvasItem,
  type FitInset,
  type FitOptions,
  type Viewport,
} from './geometry/viewport';
export {
  arrowHeadAngle,
  distanceToPath,
  edgePolyline,
  pathLength,
  pathMidpoint,
  roundedPath,
  smoothStepPath,
  type EdgeOptions,
} from './geometry/edgePath';
export { defaultScheduler, rafThrottle, type FrameScheduler, type Throttled } from './interaction/rafThrottle';
export {
  beginDrag,
  dragActivated,
  dragTo,
  endDrag,
  type CanvasDragOptions,
  type CanvasDragSession,
  type CanvasDragStep,
} from './geometry/nodeDrag';

export {
  BAND_INLINE,
  BAND_NARROW,
  BAND_WIDE,
  BANDS,
  bandAtLeast,
  bandFor,
  nextBand,
  type Band,
} from './interaction/layout';
export { DURATION, EASING, motionDuration, prefersReducedMotion } from './interaction/motion';
export { isMounted, type PresenceState } from './interaction/presence';
export { resolvePosition, type Placement, type PositionResult, type Rect, type Side } from './geometry/position';
export { type Orientation, type RovingOptions } from './interaction/roving';
export {
  filterAcross,
  filterItems,
  highlightRanges,
  matchRanges,
  matchScore,
  type FilterAcrossResult,
  type FilterResult,
  type FilterText,
  type HighlightSegment,
  type TextRange,
} from './data/filter';
export { paginationRange, type PageSlot } from './data/pagination';
export { scorePassword, strengthLabel, type PasswordScore } from './app/password';
export {
  clampColumnWidth,
  headerCheckboxState,
  nextSortState,
  resolveColumnWidths,
  toggleSelection,
  visibleColumns,
  type CheckboxState,
  type SelectionInput,
  type SelectionResult,
  type SortDirection,
  type SortState,
} from './data/table';
export { MAX_TOASTS, type Toast, type ToastAction, type ToastTone } from './app/toast';
/* The thread scroller's decisions, exported alongside the component: a module
 * that renders its own list of one day's messages still wants the same day
 * bucketing, and a test for "did the divider move?" should be able to ask. */
export {
  BOTTOM_THRESHOLD_PX,
  buildChatRows,
  distanceFromBottom,
  localDayKey,
  nextUnreadAnchor,
  preservedScrollTop,
  relativeDay,
  shouldStickToBottom,
  unreadRowIndex,
  type ChatMessageLike,
  type ChatRow,
  type ScrollMetrics,
  type UnreadAnchor,
} from './chat/messageList';
export {
  DEFAULT_OVERSCAN,
  indexAtOffset,
  rowOffsets,
  virtualWindow,
  type MeasureRow,
  type VirtualWindow,
  type VirtualWindowInput,
} from './chat/virtualList';
export { canSend, insertText, nextComposerHeight, type SendGateInput, type TextInsertion } from './chat/composer';
export {
  anonymousKey,
  initialSessionState,
  isHandedOff,
  isReady,
  markFailed,
  mergeRows,
  optimisticRow,
  parseTime,
  RESTART_SKEW_MS,
  sessionReducer,
  clockTime,
  splitTyping,
  TESTER_LABEL,
  visibleAfter,
  type TestChatAction,
  type TestChatMedia,
  type TestChatRow,
  type TestChatRowKind,
  type TestChatSession,
  type TestChatSessionAction,
  type TestChatSessionState,
  type TestChatStatus,
  type TestChatSystemKind,
} from './chat/testChat';
/* The matcher is exported alongside the hook because not every keystroke
 * belongs on a window listener: a key pressed on a focused card is that card's,
 * and the board resolves it element-side against the same specs rather than
 * keeping a second copy of the key map. */
export {
  isTypingTarget,
  matchStep,
  parseBindings,
  parseHotkey,
  resolveHotkey,
  SEQUENCE_TIMEOUT_MS,
  type HotkeyBinding,
  type HotkeyEventLike,
  type HotkeyPending,
  type HotkeyResolution,
  type HotkeyScope,
  type HotkeyStep,
  type ParsedBinding,
} from './interaction/hotkeys';
/* The chip editor's rules, beside the component: a module that keeps its
 * own keyword list still wants the same split-and-dedupe on a paste, and a
 * test for "did the over-limit batch keep the first three?" should be able
 * to ask without a render. */
export {
  DEFAULT_SEPARATORS,
  acceptItems,
  focusAfterRemove,
  hasSeparator,
  isDuplicate,
  itemLength,
  nextFocusIndex,
  normalizeItem,
  rejectionMessage,
  rejectionSummary,
  splitInput,
  type AcceptOptions,
  type AcceptResult,
  type ChipFocusContext,
  type ChipRejectReason,
  type ChipRejection,
} from './app/chips';

/* Leaving the app. `window.open` and `window.location.assign` take a bare
   string and, unlike an `href`, get no scheme check from react-dom — so the
   two calls live here behind `safeHref` rather than in the components that
   have a URL off the wire in their hands. */
export { navigateExternal, openExternal } from './app/externalLink';

/* The markdown subset the assistant emits, as a block list. Exported beside
 * the component because a module needs the same tree for things that are not a
 * render: `markdownToPlainText` is a conversation-list preview line, and
 * `safeHref` is the rule that keeps a link a model wrote from being a
 * javascript: URL. Every streaming-stability decision is documented there. */
export {
  markdownToPlainText,
  parseInline,
  parseMarkdown,
  safeHref,
  safeAppHref,
  type MarkdownBlock,
  type MarkdownList,
  type MarkdownListItem,
  type MarkdownSpan,
  type ParseMarkdownOptions,
  type TableAlign,
} from './markdown';
/* Tool ids, read. The module needs the descriptor without the card: an
 * approval banner names the same tools a step card does, and the two used to
 * disagree because each prettified the id itself. */
export {
  describeTool,
  formatRunDuration,
  formatRunSummary,
  humanizeAction,
  rollUpRunState,
  TOOL_FAMILY_LABEL,
  type RunState,
  type ToolDescriptor,
  type ToolFamily,
} from './chat/runStep';
/* The accumulate-and-flush decision behind StreamingText. Exported because a
 * module holds the socket: chunks arrive in its store, and the store is where
 * `receiveChunk` / `replaceText` / `endStream` belong. */
export {
  advance,
  EMPTY_STREAM,
  endStream,
  isSettled,
  receiveChunk,
  replaceText,
  settledStream,
  showCaret,
  visibleText,
  type AdvanceOptions,
  type StreamState,
} from './chat/streamBuffer';
/* JsonView's rules. A module that renders its own row of a tool argument —
 * the approval banner's one-line summary — wants the same collapsed label. */
export {
  entriesOf,
  formatScalar,
  isExpandable,
  jsonKind,
  jsonPath,
  opensByDefault,
  stringifyJson,
  summarize,
  truncateText,
  type JsonEntry,
  type JsonKind,
  type JsonSummary,
  type TruncatedText,
} from './chat/jsonTree';
/* The recorder's state machine, beside the component: the module owns the
 * upload and the send, so it needs the same names for the states the control
 * refuses in — and `formatElapsed` labels the clip after it has been sent. */
export {
  barHeight,
  canRecord,
  canSendRecording,
  formatElapsed,
  INITIAL_RECORDER_STATE,
  isCapturing,
  MAX_RECORDING_MS,
  METER_BARS,
  pushLevel,
  recorderHint,
  recorderReducer,
  remainingWarning,
  type RecorderEvent,
  type RecorderPhase,
  type RecorderRules,
  type RecorderState,
} from './chat/recorder';

/* Calendar maths. Exported whole because the module's own layer — instants
 * to columns, availability to slots, a schedule to shading — is written on
 * these and tested against them. */
export {
  addDays,
  addMonths,
  compareDayKeys,
  dateOfDayKey,
  dayKeyOf,
  dayKeyOfNumber,
  dayNumberOf,
  daysInMonth,
  diffDays,
  formatDayKey,
  formatMonthKey,
  groupByDayKey,
  isDayKey,
  isLeapYear,
  monthBounds,
  monthKeyOf,
  monthMatrix,
  parseDayKey,
  parseMonthKey,
  shiftDayKey,
  startOfWeek,
  weekDays,
  weekdayOf,
  weekdayOrder,
  weekStartsOnFor,
  type CivilDate,
  type DayKey,
  type MonthKey,
  type Weekday,
} from './time/calendarDate';
export {
  clampTo,
  contains,
  covers,
  intersect,
  isEmpty,
  length,
  merge,
  normalize,
  overlaps,
  sliceSlots,
  subtract,
  totalLength,
  type Interval,
  type SliceOptions,
} from './time/intervals';
export {
  DURATION_PRESETS,
  MINUTES_PER_DAY,
  formatDuration,
  formatHHmm,
  formatMinuteOfDay,
  parseDuration,
  parseHHmm,
  parseTimeInput,
  snapMinute,
  timeRangeLabel,
  timeSteps,
  usesHour12,
  type TimeLabelOptions,
} from './time/timeOfDay';
export {
  FALLBACK_TIME_ZONES,
  formatInZone,
  isValidTimeZone,
  isoOffset,
  listTimeZones,
  localTimeZone,
  offsetLabel,
  sameWallClock,
  toZoneIso,
  wallClockIn,
  wallClockToInstant,
  zoneCityLabel,
  zoneOffsetMinutes,
  type ResolveOptions,
  type WallClock,
  type WallClockInput,
} from './time/timezone';
export {
  FULL_DAY,
  HOUR_PX,
  MIN_EVENT_PX,
  RESIZE_EDGE_PX,
  clampSpan,
  columnAt,
  eventBox,
  hourMarks,
  isResizeEdge,
  laneBox,
  minuteToPx,
  nextEventFocus,
  nowOffset,
  pxToMinute,
  rangeHeightPx,
  scrollTopFor,
  splitAtMidnight,
  type DaySegment,
  type EventBox,
  type FocusKey,
  type FocusableEvent,
  type GridDensity,
  type LaneBox,
  type MinuteRange,
  type MinuteSpan,
} from './time/timeGrid';
export { packLanes, type LaneItem, type LanePlacement } from './time/lanes';
export { shortTime } from './time/shortTime';
export {
  beginGridDrag,
  endGridDrag,
  gridDragTo,
  gridKeyStep,
  spanEquals,
  type GridDragKind,
  type GridDragRules,
  type GridDragState,
  type GridPoint,
  type GridSpan,
  type KeyLike,
} from './time/gridDrag';
export {
  EVENT_TONES,
  EVENT_TONE_COUNT,
  assignTones,
  eventToneFor,
  isEventTone,
  type EventTone,
} from './time/eventPalette';

/* Column order arithmetic, beside the table it drives: the caller persists the
   order, so it also has to be able to compute one — a saved view applying a
   stored order to a changed column set is the same problem. */
export {
  applyVisibleOrder,
  columnReorderAction,
  nextReorderTarget,
  reorderColumns,
  reorderMovableColumns,
  type ColumnReorderAction,
} from './data/table';

/* Inline editing's rules. Exported for the same reason the table's own
   arithmetic is: a module that renders its own editable surface — a record
   page's field list — wants the same answer to "what does Enter do here?"
   without re-deriving it, and a test should be able to ask. */
export {
  DEFAULT_EDIT_ERROR,
  SAVED_FLASH_MS,
  cellId,
  cellKeyAction,
  editChanged,
  editErrorMessage,
  editKeyAction,
  editorHoldsKey,
  firstEditableCell,
  isEditableCell,
  isThenable,
  nextEditableCell,
  sameCell,
  type CellEditState,
  type CellEditStatus,
  type CellKeyAction,
  type EditKeyAction,
  type EditKeyLike,
  type EditMove,
  type EditableCell,
  type EditableGrid,
} from './data/tableEdit';

/* Trail collapsing, beside Breadcrumbs: which steps get dropped is a decision,
   and a module that renders its own trail should not re-invent it. */
export { MIN_VISIBLE_ITEMS, collapseTrail, hiddenTrailLabel, type TrailItem, type TrailSlot } from './app/breadcrumbs';

/* The wording and arithmetic of a long client-side run. Exported because the
   run itself lives in the module — this API has no bulk mutation, so the loop
   is the module's — while what it is allowed to SAY is the design system's. */
export {
  bulkAnnouncement,
  bulkPercent,
  bulkSummary,
  bulkTone,
  type BulkRunState,
  type BulkRunStatus,
} from './app/bulkRun';

/* Option grouping, beside the Combobox that uses it. A picker that renders its
   own list — the filter builder's attribute menu is one — needs the same
   guarantee: headers are outside the index the arrow keys walk. */
export { groupOptions, ungroupedCount, type GroupedOptions, type OptionGroupRun } from './data/optionGroups';

export { UNDO_OFFER_TTL_MS, nextOffer, type UndoOffer } from './app/undoOffer';

export { formatFileSize } from './app/fileSize';

export {
  asString,
  isRecord,
  nextEntryId,
  parseStoredList,
  removeEntry,
  renameEntry,
  serializeStoredList,
  upsertEntry,
  type ParsedStoredList,
} from './data/savedViewsCore';

export { CSV_BOM, csvEscape, csvText, downloadTextFile } from './data/csvExport';
