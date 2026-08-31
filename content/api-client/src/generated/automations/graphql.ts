import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AdID: { input: string; output: string; }
  AiAgentKnowledgeItemID: { input: string; output: string; }
  AttributeName: { input: string; output: string; }
  AuthToken: { input: string; output: string; }
  BlockElementID: { input: string; output: string; }
  BlockID: { input: string; output: string; }
  BookingID: { input: string; output: string; }
  BookingTimeString: { input: string; output: string; }
  BotAPIToken: { input: string; output: string; }
  BotAttributeCursor: { input: string; output: string; }
  BotAttributeValueID: { input: string; output: string; }
  BotID: { input: string; output: string; }
  BotInviteID: { input: string; output: string; }
  BotInviteToken: { input: string; output: string; }
  BotTeamMemberID: { input: string; output: string; }
  BotTimezone: { input: string; output: string; }
  BotsCursor: { input: string; output: string; }
  CSVContactImportID: { input: string; output: string; }
  ClientMID: { input: string; output: string; }
  CommentReplyRulesCursor: { input: string; output: string; }
  ComponentHandleID: { input: string; output: string; }
  ConnectionID: { input: string; output: string; }
  ContactAttributeID: { input: string; output: string; }
  ContactID: { input: string; output: string; }
  ContactScopeID: { input: string; output: string; }
  ContactSearchCursor: { input: string; output: string; }
  ConversationID: { input: string; output: string; }
  CountryCode: { input: string; output: string; }
  CoworkerConversationID: { input: string; output: string; }
  CoworkerConversationIceBreakerID: { input: string; output: string; }
  CoworkerConversationMessageID: { input: string; output: string; }
  CoworkerConversationsCursor: { input: string; output: string; }
  CoworkerHomePageCardID: { input: string; output: string; }
  CoworkerMessagesCursor: { input: string; output: string; }
  CoworkerSkillID: { input: string; output: string; }
  CoworkerUserDefinedSkillID: { input: string; output: string; }
  FacebookBusinessID: { input: string; output: string; }
  FacebookBusinessVerificationSubmissionID: { input: string; output: string; }
  FacebookPermission: { input: string; output: string; }
  FbPageCursor: { input: string; output: string; }
  FbPageID: { input: string; output: string; }
  FbPagePostCursor: { input: string; output: string; }
  FbPostID: { input: string; output: string; }
  FileID: { input: string; output: string; }
  FilledWhatsAppTemplateID: { input: string; output: string; }
  FilterID: { input: string; output: string; }
  FlowGroupID: { input: string; output: string; }
  FlowID: { input: string; output: string; }
  FuelyAutomationID: { input: string; output: string; }
  FuelyBroadcastCursor: { input: string; output: string; }
  FuelyBroadcastID: { input: string; output: string; }
  FuelyInitialSetupID: { input: string; output: string; }
  FuelySettingSendEventsToMetaEventID: { input: string; output: string; }
  GoodsItemID: { input: string; output: string; }
  GoogleCalendarID: { input: string; output: string; }
  InlineContactID: { input: string; output: string; }
  InstagramAccountID: { input: string; output: string; }
  InstagramMediaID: { input: string; output: string; }
  InstagramMediasCursor: { input: string; output: string; }
  KeywordRuleCursor: { input: string; output: string; }
  KeywordRuleID: { input: string; output: string; }
  Long: { input: number; output: number; }
  Map: { input: Record<string, unknown>; output: Record<string, unknown>; }
  MessageID: { input: string; output: string; }
  MessagesCursor: { input: string; output: string; }
  MetaAdAccountID: { input: string; output: string; }
  MetaAdAccountSynthID: { input: string; output: string; }
  MetaAdCursor: { input: string; output: string; }
  MetaAdID: { input: string; output: string; }
  MetaAdSynthID: { input: string; output: string; }
  PlatformOperationLinkID: { input: string; output: string; }
  PostID: { input: string; output: string; }
  PreVerifiedBusinessPhoneNumberID: { input: string; output: string; }
  PreviewResponsesSessionID: { input: string; output: string; }
  SchemaVersion: { input: string; output: string; }
  SegmentID: { input: string; output: string; }
  SendJsonHeaderID: { input: string; output: string; }
  SendJsonResponseParsingRuleID: { input: string; output: string; }
  SendJsonURLParamID: { input: string; output: string; }
  SenderID: { input: string; output: string; }
  SpecialistGoogleCalendarLinkID: { input: string; output: string; }
  SpecialistID: { input: string; output: string; }
  SpecialistScheduleTime: { input: string; output: string; }
  StoryID: { input: string; output: string; }
  TaskID: { input: string; output: string; }
  TikTokAccountID: { input: string; output: string; }
  TikTokPermission: { input: string; output: string; }
  TikTokPostID: { input: string; output: string; }
  Time: { input: string; output: string; }
  TriggerID: { input: string; output: string; }
  UserAccountID: { input: string; output: string; }
  WebWidgetID: { input: string; output: string; }
  WhatsAppBusinessPhoneID: { input: string; output: string; }
  WhatsAppTemplateCursor: { input: string; output: string; }
  WhatsAppTemplateID: { input: string; output: string; }
  WhatsAppTemplateTextParamName: { input: string; output: string; }
  WhatsappBusinessAccountID: { input: string; output: string; }
  WorkspaceID: { input: string; output: string; }
};

export enum AdSetDestinationType {
  InstagramDirect = 'InstagramDirect',
  Unknown = 'Unknown',
  WhatsApp = 'WhatsApp'
}

export enum AiAgentTemplateId {
  AiAgentBookAppointments = 'aiAgentBookAppointments',
  AiAgentCustom = 'aiAgentCustom',
  AiAgentHelpCustomers = 'aiAgentHelpCustomers',
  AiAgentManageNewMessages = 'aiAgentManageNewMessages',
  AiAgentSellProducts = 'aiAgentSellProducts',
  AiAgentSortThroughLeads = 'aiAgentSortThroughLeads'
}

export enum AttrFilterDateOperator {
  Gt = 'GT',
  Is = 'IS',
  IsEmpty = 'IS_EMPTY',
  IsNot = 'IS_NOT',
  IsNotEmpty = 'IS_NOT_EMPTY',
  Lt = 'LT'
}

export type AttrFilterDateStrategyInput = {
  comparableDate: Scalars['Time']['input'];
  operator: AttrFilterDateOperator;
};

export enum AttrFilterDefaultOperator {
  Contains = 'CONTAINS',
  Gt = 'GT',
  Is = 'IS',
  IsEmpty = 'IS_EMPTY',
  IsNot = 'IS_NOT',
  IsNotEmpty = 'IS_NOT_EMPTY',
  Lt = 'LT',
  StartsWith = 'STARTS_WITH'
}

export type AttrFilterDefaultStrategyInput = {
  comparableValues: Array<Scalars['String']['input']>;
  operator: AttrFilterDefaultOperator;
};

export enum AttrFilterErrCode {
  AttrFilterAttrNameInvalidChars = 'attr_filter_attr_name_invalid_chars',
  AttrFilterAttrNameRequired = 'attr_filter_attr_name_required',
  AttrFilterAttrNameTooLong = 'attr_filter_attr_name_too_long',
  AttrFilterComparableDateRequired = 'attr_filter_comparable_date_required',
  AttrFilterComparableValuesNotAllowed = 'attr_filter_comparable_values_not_allowed',
  AttrFilterComparableValuesRequired = 'attr_filter_comparable_values_required',
  AttrFilterTooManyStrategies = 'attr_filter_too_many_strategies',
  FilterBodyRequired = 'filter_body_required',
  InvalidOperator = 'invalid_operator'
}

export type AttrFilterInput = {
  dateStrategy?: InputMaybe<AttrFilterDateStrategyInput>;
  defaultStrategy?: InputMaybe<AttrFilterDefaultStrategyInput>;
  name: Scalars['String']['input'];
};

export enum AttributeDataType {
  Boolean = 'boolean',
  Datetime = 'datetime',
  Double = 'double',
  Long = 'long',
  String = 'string'
}

export enum AttributeType {
  Custom = 'custom',
  System = 'system'
}

export enum AudioTranscriptionStatus {
  Failed = 'failed',
  Finished = 'finished',
  None = 'none',
  Skipped = 'skipped'
}

export type BlockPositionBulkUpdate = {
  blockID: Scalars['BlockID']['input'];
  positionX: Scalars['Int']['input'];
  positionY: Scalars['Int']['input'];
};

export type BlockToBlockConnectionCreateRequest = {
  sourceBlockID: Scalars['BlockID']['input'];
  targetBlockID: Scalars['BlockID']['input'];
};

export type BookingInlineContactInput = {
  countryCode?: InputMaybe<Scalars['CountryCode']['input']>;
  name: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  phoneNumber: Scalars['String']['input'];
};

export type BookingInput = {
  contactID?: InputMaybe<Scalars['ContactID']['input']>;
  endTime: Scalars['Time']['input'];
  inlineContact?: InputMaybe<BookingInlineContactInput>;
  serviceID?: InputMaybe<Scalars['GoodsItemID']['input']>;
  specialistID?: InputMaybe<Scalars['SpecialistID']['input']>;
  startTime: Scalars['Time']['input'];
};

export enum BookingStatus {
  Attended = 'Attended',
  Canceled = 'Canceled',
  Confirmed = 'Confirmed',
  NoShow = 'NoShow',
  Pending = 'Pending',
  Reschedule = 'Reschedule'
}

export type BookingUpdateInput = {
  contactID?: InputMaybe<Scalars['ContactID']['input']>;
  endTime: Scalars['Time']['input'];
  inlineContact?: InputMaybe<BookingInlineContactInput>;
  serviceID?: InputMaybe<Scalars['GoodsItemID']['input']>;
  specialistID?: InputMaybe<Scalars['SpecialistID']['input']>;
  startTime: Scalars['Time']['input'];
};

export enum BoolOperator {
  And = 'AND',
  Or = 'OR'
}

export type BotAttributeFilter = {
  field: BotAttributeFilterField;
  value: BotAttributeFilterValue;
};

export enum BotAttributeFilterField {
  UsedInFlowIDs = 'UsedInFlowIDs'
}

export type BotAttributeFilterValue = {
  type: BotAttributeFilterValueType;
  val: Array<Scalars['String']['input']>;
};

export enum BotAttributeFilterValueType {
  Any = 'Any',
  Contains = 'Contains',
  Eq = 'Eq'
}

export enum BotAttributeOrderBy {
  AttributeName = 'AttributeName',
  ContactsCount = 'ContactsCount',
  DefaultValue = 'DefaultValue',
  UsedInFlowsCount = 'UsedInFlowsCount'
}

export type BotAttributeOrderByInput = {
  direction: Sort;
  orderBy: BotAttributeOrderBy;
};

export enum BotFilterField {
  Title = 'Title',
  WorkspaceId = 'WorkspaceID'
}

export type BotFilterValue = {
  type: BotFilterValueType;
  val?: InputMaybe<Scalars['String']['input']>;
};

export enum BotFilterValueType {
  Any = 'Any',
  Eq = 'Eq',
  None = 'None'
}

export type BotIndustryInput = {
  category: Scalars['String']['input'];
  subCategory?: InputMaybe<Scalars['String']['input']>;
};

export type BotRoleInputV2 = {
  botPermissions: Array<PermissionInput>;
  roleType: BotRoleTypeV2;
};

export enum BotRoleTypeV2 {
  Admin = 'Admin',
  Agent = 'Agent',
  Custom = 'Custom',
  Editor = 'Editor'
}

export type BotsFilter = {
  field: BotFilterField;
  value: BotFilterValue;
};

export enum BotsOrderBy {
  CreatedAt = 'CreatedAt',
  LastOpenedAt = 'LastOpenedAt',
  Title = 'Title',
  Usage = 'Usage'
}

export type BotsOrderByInput = {
  direction: Sort;
  orderBy: BotsOrderBy;
};

export enum BroadcastRepeatType {
  EveryNDays = 'EveryNDays',
  Never = 'Never',
  OnCertainDates = 'OnCertainDates',
  Weekdays = 'Weekdays'
}

export enum BroadcastStatus {
  Draft = 'Draft',
  Finished = 'Finished',
  Live = 'Live',
  Paused = 'Paused'
}

export enum CsvContactImportColumnErrorCode {
  AttrIsInvalid = 'AttrIsInvalid',
  ColumnDuplicated = 'ColumnDuplicated',
  SystemAttrNotAllowed = 'SystemAttrNotAllowed'
}

export type CsvContactImportColumnUpdate = {
  attributeName: Scalars['AttributeName']['input'];
  columnIndex: Scalars['Int']['input'];
};

export type CsvContactImportColumnsUpdate = {
  columns: Array<CsvContactImportColumnUpdate>;
};

export enum CsvContactImportCommonErrorCode {
  FileInvalidFormat = 'FileInvalidFormat',
  FileIsEmpty = 'FileIsEmpty',
  FileSizeTooBig = 'FileSizeTooBig',
  WaPhoneRequired = 'WaPhoneRequired'
}

export type ComponentToBlockConnectionCreateRequest = {
  sourceBlockElementID: Scalars['BlockElementID']['input'];
  sourceBlockID: Scalars['BlockID']['input'];
  sourceHandleID: Scalars['ComponentHandleID']['input'];
  targetBlockID: Scalars['BlockID']['input'];
};

export type ContactAssigneeFilter = {
  assigneeID?: InputMaybe<Scalars['UserAccountID']['input']>;
  type: ContactAssigneeFilterType;
};

export enum ContactAssigneeFilterType {
  Any = 'Any',
  AssigneeId = 'AssigneeID',
  FuelyAi = 'FuelyAI',
  Unassigned = 'Unassigned'
}

export type ContactChatsCountFilter = {
  assigneeFilter: ContactAssigneeFilter;
  lastMessageTimeAfter?: InputMaybe<Scalars['Time']['input']>;
  lastMessageTimeBefore?: InputMaybe<Scalars['Time']['input']>;
  salesStageV2Filter: Array<SalesStageV2>;
  textInputFilter?: InputMaybe<Scalars['String']['input']>;
  unreadOnly: Scalars['Boolean']['input'];
};

export enum ContactDashboardSource {
  CalendarBooking = 'CalendarBooking'
}

export enum ContactListUpdateAction {
  Add = 'Add',
  Remove = 'Remove',
  Update = 'Update'
}

export type ContactSearchOrderByInput = {
  direction: Sort;
  orderBy: Scalars['AttributeName']['input'];
};

export enum ConversationStatus {
  Automated = 'automated',
  Closed = 'closed',
  Open = 'open'
}

export enum CoworkerFrontendStateQuery {
  ScreenContext = 'screen_context'
}

export enum CoworkerMessageClientActionType {
  QuickReply = 'QuickReply'
}

export enum CoworkerMessageRole {
  Coworker = 'coworker',
  User = 'user'
}

export enum CoworkerUserMessageRejectionReason {
  InvalidAttachments = 'InvalidAttachments'
}

export enum DashboardLocale {
  En = 'En',
  Es = 'Es',
  Id = 'Id',
  Ms = 'Ms',
  Pt = 'Pt'
}

export type DealsByStagesFilter = {
  assigneeFilter: ContactAssigneeFilter;
  salesStageUpdatedAfter?: InputMaybe<Scalars['Time']['input']>;
  salesStageUpdatedBefore?: InputMaybe<Scalars['Time']['input']>;
};

export enum DefaultReplyFrequency {
  Always = 'always',
  OnceIn24Hours = 'onceIn24Hours'
}

export enum DefinedErrorCode {
  AccountMergeFacebookConflict = 'AccountMergeFacebookConflict',
  AccountMergeGoogleConflict = 'AccountMergeGoogleConflict',
  AssigneeHasNoAccess = 'AssigneeHasNoAccess',
  AttachmentInvalid = 'AttachmentInvalid',
  AttributeIsNotAllowedForPlatform = 'AttributeIsNotAllowedForPlatform',
  AttributeNameInvalidChars = 'AttributeNameInvalidChars',
  AttributeNameIsEmpty = 'AttributeNameIsEmpty',
  AttributeNameIsReserved = 'AttributeNameIsReserved',
  AttributeNameTooLong = 'AttributeNameTooLong',
  AttributeValueIncorrectDataType = 'AttributeValueIncorrectDataType',
  AttributeValueTooLong = 'AttributeValueTooLong',
  BookingContactPlatformNotAllowed = 'BookingContactPlatformNotAllowed',
  BookingDoesNotExist = 'BookingDoesNotExist',
  BookingEndTimeBeforeStartTime = 'BookingEndTimeBeforeStartTime',
  BookingEndTimeRequired = 'BookingEndTimeRequired',
  BookingInlineContactDoesNotExist = 'BookingInlineContactDoesNotExist',
  BookingInlineContactNoteTooLong = 'BookingInlineContactNoteTooLong',
  BookingInvalidDuration = 'BookingInvalidDuration',
  BookingNotificationChannelNotAllowed = 'BookingNotificationChannelNotAllowed',
  BookingStartTimeRequired = 'BookingStartTimeRequired',
  BotAlreadyHasWhatsAppLink = 'BotAlreadyHasWhatsAppLink',
  BotCreationRateLimit = 'BotCreationRateLimit',
  BotDoesNotExist = 'BotDoesNotExist',
  BotInvalidTimezone = 'BotInvalidTimezone',
  BotMigratedToNewFuelySettings = 'BotMigratedToNewFuelySettings',
  BusinessDoesNotMeetWaPolicy = 'BusinessDoesNotMeetWAPolicy',
  BusinessPhoneBizAppDataSyncAlreadyStarted = 'BusinessPhoneBizAppDataSyncAlreadyStarted',
  BusinessPhoneIsNotOnBizApp = 'BusinessPhoneIsNotOnBizApp',
  BusinessPhoneNotConnectedToCloudApi = 'BusinessPhoneNotConnectedToCloudAPI',
  CsvContactExportAlreadyInProgress = 'CSVContactExportAlreadyInProgress',
  CsvContactExportDoesNotExist = 'CSVContactExportDoesNotExist',
  CsvContactExportInvalidContactIDsCount = 'CSVContactExportInvalidContactIDsCount',
  CsvContactImportAlreadyFinished = 'CSVContactImportAlreadyFinished',
  CsvContactImportAlreadyStarted = 'CSVContactImportAlreadyStarted',
  CsvContactImportAtLeastOneColumnRequired = 'CSVContactImportAtLeastOneColumnRequired',
  CsvContactImportDoesNotExist = 'CSVContactImportDoesNotExist',
  CsvContactImportErrorsEmpty = 'CSVContactImportErrorsEmpty',
  CsvContactImportErrorsExpired = 'CSVContactImportErrorsExpired',
  CsvContactImportFileDoesNotExist = 'CSVContactImportFileDoesNotExist',
  CsvContactImportInvalidColumnIndex = 'CSVContactImportInvalidColumnIndex',
  CsvContactImportNotFinishedYet = 'CSVContactImportNotFinishedYet',
  CsvRowHasInvalidFormat = 'CSVRowHasInvalidFormat',
  CannotDisconnectWidgetScope = 'CannotDisconnectWidgetScope',
  CannotRemoveLastAdminMember = 'CannotRemoveLastAdminMember',
  CommentReplyRuleBothRepliesAreDisabled = 'CommentReplyRuleBothRepliesAreDisabled',
  CommentReplyRuleCatchAllAlreadyExists = 'CommentReplyRuleCatchAllAlreadyExists',
  CommentReplyRuleDoesNotExist = 'CommentReplyRuleDoesNotExist',
  CommentReplyRuleKeywordIsDuplicated = 'CommentReplyRuleKeywordIsDuplicated',
  CommentReplyRuleMatchingRuleNotFound = 'CommentReplyRuleMatchingRuleNotFound',
  CommentReplyRuleMaxCountPerPlatformReached = 'CommentReplyRuleMaxCountPerPlatformReached',
  CommentReplyRuleMaxKeywordLengthReached = 'CommentReplyRuleMaxKeywordLengthReached',
  CommentReplyRuleMaxKeywordsPerRuleReached = 'CommentReplyRuleMaxKeywordsPerRuleReached',
  CommentReplyRuleNeedAtLeastOneKeyword = 'CommentReplyRuleNeedAtLeastOneKeyword',
  CommentReplyRulePrivateReplyPromptIsEmpty = 'CommentReplyRulePrivateReplyPromptIsEmpty',
  CommentReplyRulePrivateReplyPromptIsTooLong = 'CommentReplyRulePrivateReplyPromptIsTooLong',
  CommentReplyRulePublicReplyPromptIsEmpty = 'CommentReplyRulePublicReplyPromptIsEmpty',
  CommentReplyRulePublicReplyPromptIsTooLong = 'CommentReplyRulePublicReplyPromptIsTooLong',
  CommentReplyRuleReplyInputInvalid = 'CommentReplyRuleReplyInputInvalid',
  CommentReplyRuleReplyPromptIsEmpty = 'CommentReplyRuleReplyPromptIsEmpty',
  CommentReplyRuleReplyPromptIsTooLong = 'CommentReplyRuleReplyPromptIsTooLong',
  CommentReplyRuleReplyToAllAlreadyExists = 'CommentReplyRuleReplyToAllAlreadyExists',
  CommentReplyRuleReplyToAllForbidsCriteria = 'CommentReplyRuleReplyToAllForbidsCriteria',
  ComponentHasValidationErrors = 'ComponentHasValidationErrors',
  ContactDoesNotExist = 'ContactDoesNotExist',
  ContactHasNoAssignee = 'ContactHasNoAssignee',
  ContactImportPlatformNotAllowed = 'ContactImportPlatformNotAllowed',
  ContactNameRequired = 'ContactNameRequired',
  ContactNameTooLong = 'ContactNameTooLong',
  ContactNoteTooLong = 'ContactNoteTooLong',
  ContactScopeAlreadyConnected = 'ContactScopeAlreadyConnected',
  ContactScopeNotConnected = 'ContactScopeNotConnected',
  ContactSearchSizeInvalid = 'ContactSearchSizeInvalid',
  CopyCodeButtonCodeValueTooLong = 'CopyCodeButtonCodeValueTooLong',
  CoworkerConversationDoesNotExist = 'CoworkerConversationDoesNotExist',
  DisplayNameCouldNotBeProcessed = 'DisplayNameCouldNotBeProcessed',
  EnabledTriggerIsImmutable = 'EnabledTriggerIsImmutable',
  FbEntitiesRefetchInProgress = 'FBEntitiesRefetchInProgress',
  FacebookAccountRequired = 'FacebookAccountRequired',
  FacebookAdsReadPermissionRequired = 'FacebookAdsReadPermissionRequired',
  FacebookBusinessAlreadyVerified = 'FacebookBusinessAlreadyVerified',
  FacebookBusinessDoesNotExist = 'FacebookBusinessDoesNotExist',
  FacebookBusinessDoesNotVerified = 'FacebookBusinessDoesNotVerified',
  FacebookBusinessVerificationSubmissionAlreadyExists = 'FacebookBusinessVerificationSubmissionAlreadyExists',
  FacebookBusinessVerificationSubmissionAtLeastOneFileRequired = 'FacebookBusinessVerificationSubmissionAtLeastOneFileRequired',
  FacebookBusinessVerificationSubmissionAttemptsAreOver = 'FacebookBusinessVerificationSubmissionAttemptsAreOver',
  FacebookBusinessVerificationSubmissionDoesNotExist = 'FacebookBusinessVerificationSubmissionDoesNotExist',
  FacebookBusinessVerificationSubmissionFileDoesNotExist = 'FacebookBusinessVerificationSubmissionFileDoesNotExist',
  FacebookBusinessVerificationSubmissionFileSizeTooBig = 'FacebookBusinessVerificationSubmissionFileSizeTooBig',
  FacebookBusinessVerificationSubmissionLockedForClarification = 'FacebookBusinessVerificationSubmissionLockedForClarification',
  FacebookBusinessVerificationSubmissionTooManyFiles = 'FacebookBusinessVerificationSubmissionTooManyFiles',
  FacebookUserDoesNotExist = 'FacebookUserDoesNotExist',
  FacebookUserProfileMismatch = 'FacebookUserProfileMismatch',
  FileContentTypeNotSupported = 'FileContentTypeNotSupported',
  FileDoesNotExist = 'FileDoesNotExist',
  FileNameFormatNotSupported = 'FileNameFormatNotSupported',
  FileNameTooLong = 'FileNameTooLong',
  FileTooBig = 'FileTooBig',
  FlowGroupCanNotBeDeleted = 'FlowGroupCanNotBeDeleted',
  FlowStartingPointBlockDoesNotExist = 'FlowStartingPointBlockDoesNotExist',
  FrontendStateRequestNotFound = 'FrontendStateRequestNotFound',
  FuelyAdIdTooLong = 'FuelyAdIDTooLong',
  FuelyAdditionalInstructionsCharLimitExceeded = 'FuelyAdditionalInstructionsCharLimitExceeded',
  FuelyAgentAdditionalInstructionsLengthIsTooLong = 'FuelyAgentAdditionalInstructionsLengthIsTooLong',
  FuelyAgentNameLengthIsTooLong = 'FuelyAgentNameLengthIsTooLong',
  FuelyAutomationBeingEdited = 'FuelyAutomationBeingEdited',
  FuelyAutomationNameInvalid = 'FuelyAutomationNameInvalid',
  FuelyAutomationNotDeletable = 'FuelyAutomationNotDeletable',
  FuelyAutomationNotFound = 'FuelyAutomationNotFound',
  FuelyAutomationNotRenamable = 'FuelyAutomationNotRenamable',
  FuelyAutomationScopeInvalid = 'FuelyAutomationScopeInvalid',
  FuelyAutomationScopeLimitReached = 'FuelyAutomationScopeLimitReached',
  FuelyBroadcastSendTimeCanNotBeInPast = 'FuelyBroadcastSendTimeCanNotBeInPast',
  FuelyBusinessHoursScheduleDuplicateDays = 'FuelyBusinessHoursScheduleDuplicateDays',
  FuelyBusinessHoursScheduleInvalidTimeFormat = 'FuelyBusinessHoursScheduleInvalidTimeFormat',
  FuelyBusinessHoursScheduleInvalidTimeRange = 'FuelyBusinessHoursScheduleInvalidTimeRange',
  FuelyCatalogImagesCountOutOfRange = 'FuelyCatalogImagesCountOutOfRange',
  FuelyChatLanguageLengthIsTooLong = 'FuelyChatLanguageLengthIsTooLong',
  FuelyCollectContactInfoDescriptionTooLong = 'FuelyCollectContactInfoDescriptionTooLong',
  FuelyCollectContactInfoTooManyEntries = 'FuelyCollectContactInfoTooManyEntries',
  FuelyCommentRepliesPromptLengthIsTooLong = 'FuelyCommentRepliesPromptLengthIsTooLong',
  FuelyFollowUpsMessagePromptEmpty = 'FuelyFollowUpsMessagePromptEmpty',
  FuelyFollowUpsMessagePromptTooLong = 'FuelyFollowUpsMessagePromptTooLong',
  FuelyGreetingMessageLengthIsTooLong = 'FuelyGreetingMessageLengthIsTooLong',
  FuelyIncomingMessagesMessagePromptEmpty = 'FuelyIncomingMessagesMessagePromptEmpty',
  FuelyIncomingMessagesMessagePromptTooLong = 'FuelyIncomingMessagesMessagePromptTooLong',
  FuelyInheritFromInvalid = 'FuelyInheritFromInvalid',
  FuelyInitialSetupDocumentsTooMuch = 'FuelyInitialSetupDocumentsTooMuch',
  FuelyInitialSetupWrongStep = 'FuelyInitialSetupWrongStep',
  FuelyInvalidRespondToCustomers = 'FuelyInvalidRespondToCustomers',
  FuelyKeywordTooLong = 'FuelyKeywordTooLong',
  FuelyKeywordsTooMany = 'FuelyKeywordsTooMany',
  FuelyKnowledgeBaseLimitExceeded = 'FuelyKnowledgeBaseLimitExceeded',
  FuelyKnowledgeBaseLimitReached = 'FuelyKnowledgeBaseLimitReached',
  FuelyLikeContactCommentNotAllowed = 'FuelyLikeContactCommentNotAllowed',
  FuelyListOfAdsTooManyEntries = 'FuelyListOfAdsTooManyEntries',
  FuelyListOfPostsNoConnectedAccount = 'FuelyListOfPostsNoConnectedAccount',
  FuelyListOfPostsScopeNotImplemented = 'FuelyListOfPostsScopeNotImplemented',
  FuelyListOfPostsTooManyEntries = 'FuelyListOfPostsTooManyEntries',
  FuelyListOfStoriesNoConnectedAccount = 'FuelyListOfStoriesNoConnectedAccount',
  FuelyListOfStoriesTooManyEntries = 'FuelyListOfStoriesTooManyEntries',
  FuelyMissingInfoFallbackMessageLengthIsTooLong = 'FuelyMissingInfoFallbackMessageLengthIsTooLong',
  FuelyNoCatalogItems = 'FuelyNoCatalogItems',
  FuelyNoFaQs = 'FuelyNoFAQs',
  FuelyPostIdTooLong = 'FuelyPostIDTooLong',
  FuelyPostMediaNotFound = 'FuelyPostMediaNotFound',
  FuelyPostMediaWrongType = 'FuelyPostMediaWrongType',
  FuelyRefLinkTooLong = 'FuelyRefLinkTooLong',
  FuelyRefLinksTooMany = 'FuelyRefLinksTooMany',
  FuelyReplyExactTextEmpty = 'FuelyReplyExactTextEmpty',
  FuelyReplyExactTextTooLong = 'FuelyReplyExactTextTooLong',
  FuelyReplyMessagePromptEmpty = 'FuelyReplyMessagePromptEmpty',
  FuelyReplyMessagePromptTooLong = 'FuelyReplyMessagePromptTooLong',
  FuelySendEventsToMetaAttributeConditionsEmpty = 'FuelySendEventsToMetaAttributeConditionsEmpty',
  FuelySendEventsToMetaConditionPromptEmpty = 'FuelySendEventsToMetaConditionPromptEmpty',
  FuelySendEventsToMetaConditionPromptTooLong = 'FuelySendEventsToMetaConditionPromptTooLong',
  FuelySendEventsToMetaCustomEventNameIsStandard = 'FuelySendEventsToMetaCustomEventNameIsStandard',
  FuelySendEventsToMetaCustomEventNameTooLong = 'FuelySendEventsToMetaCustomEventNameTooLong',
  FuelySendEventsToMetaDuplicateEvent = 'FuelySendEventsToMetaDuplicateEvent',
  FuelySendEventsToMetaDuplicateEventId = 'FuelySendEventsToMetaDuplicateEventID',
  FuelySendEventsToMetaEventNameInvalid = 'FuelySendEventsToMetaEventNameInvalid',
  FuelySendEventsToMetaEventNotFound = 'FuelySendEventsToMetaEventNotFound',
  FuelySendEventsToMetaKeywordsEmpty = 'FuelySendEventsToMetaKeywordsEmpty',
  FuelySendEventsToMetaKeywordsRuleEmpty = 'FuelySendEventsToMetaKeywordsRuleEmpty',
  FuelySendEventsToMetaSalesStagesEmpty = 'FuelySendEventsToMetaSalesStagesEmpty',
  FuelySendEventsToMetaSwitchToHumanFromEmpty = 'FuelySendEventsToMetaSwitchToHumanFromEmpty',
  FuelySendEventsToMetaTooManyAttributeConditions = 'FuelySendEventsToMetaTooManyAttributeConditions',
  FuelySendEventsToMetaTooManyEvents = 'FuelySendEventsToMetaTooManyEvents',
  FuelySendEventsToMetaTriggerFieldNotAllowed = 'FuelySendEventsToMetaTriggerFieldNotAllowed',
  FuelySettingNotAllowedInScope = 'FuelySettingNotAllowedInScope',
  FuelyStoryIdTooLong = 'FuelyStoryIDTooLong',
  FuelyStoryMediaNotFound = 'FuelyStoryMediaNotFound',
  FuelyStoryMediaWrongType = 'FuelyStoryMediaWrongType',
  FuelySummarizeChatAtLeastOneEntryRequired = 'FuelySummarizeChatAtLeastOneEntryRequired',
  FuelySummarizeChatEntryDoesNotExist = 'FuelySummarizeChatEntryDoesNotExist',
  FuelySummarizeChatHasValidationErrors = 'FuelySummarizeChatHasValidationErrors',
  FuelySwitchToHumanMessagePromptEmpty = 'FuelySwitchToHumanMessagePromptEmpty',
  FuelySwitchToHumanMessagePromptTooLong = 'FuelySwitchToHumanMessagePromptTooLong',
  FuelySwitchToHumanRulePromptEmpty = 'FuelySwitchToHumanRulePromptEmpty',
  FuelySwitchToHumanRulePromptTooLong = 'FuelySwitchToHumanRulePromptTooLong',
  FuelySwitchToHumanRulesEmpty = 'FuelySwitchToHumanRulesEmpty',
  FuelySwitchToHumanSwitchingConditionsEmpty = 'FuelySwitchToHumanSwitchingConditionsEmpty',
  FuelySwitchToHumanSwitchingConditionsTooLong = 'FuelySwitchToHumanSwitchingConditionsTooLong',
  FuelySwitchToHumanTooManyAssignees = 'FuelySwitchToHumanTooManyAssignees',
  FuelySwitchToHumanTooManyRules = 'FuelySwitchToHumanTooManyRules',
  FuelyTemplateDuplicateAutomation = 'FuelyTemplateDuplicateAutomation',
  FuelyTemplateDuplicateSetting = 'FuelyTemplateDuplicateSetting',
  FuelyTemplateSettingNotSupported = 'FuelyTemplateSettingNotSupported',
  FuelyTemplateSwitchToHumanAssigneesNotSupported = 'FuelyTemplateSwitchToHumanAssigneesNotSupported',
  GoodsItemDescriptionTooLong = 'GoodsItemDescriptionTooLong',
  GoodsItemNotFound = 'GoodsItemNotFound',
  GoodsItemPriceAmountWrongFormat = 'GoodsItemPriceAmountWrongFormat',
  GoodsItemPriceCurrencyRequired = 'GoodsItemPriceCurrencyRequired',
  GoodsItemTitleNotUnique = 'GoodsItemTitleNotUnique',
  GoodsItemTitleRequired = 'GoodsItemTitleRequired',
  GoodsItemTitleTooLong = 'GoodsItemTitleTooLong',
  GoodsItemTitleTooShort = 'GoodsItemTitleTooShort',
  GoodsItemsTooMuchForBot = 'GoodsItemsTooMuchForBot',
  GoodsProductImagesTooMuch = 'GoodsProductImagesTooMuch',
  GoodsServiceDurationRequired = 'GoodsServiceDurationRequired',
  GoodsServiceImagesTooMuch = 'GoodsServiceImagesTooMuch',
  GoogleCalendarDoesNotExists = 'GoogleCalendarDoesNotExists',
  GoogleCalendarNotConnected = 'GoogleCalendarNotConnected',
  GoogleCalendarSyncAlreadyInProgress = 'GoogleCalendarSyncAlreadyInProgress',
  GoogleCalendarSyncRateLimited = 'GoogleCalendarSyncRateLimited',
  GoogleUserProfileMismatch = 'GoogleUserProfileMismatch',
  InstagramCarouselSizeInvalid = 'InstagramCarouselSizeInvalid',
  InstagramDoesNotConnected = 'InstagramDoesNotConnected',
  InstagramMissingPermissionsOrExpiredToken = 'InstagramMissingPermissionsOrExpiredToken',
  InstagramPublishCaptionTooLong = 'InstagramPublishCaptionTooLong',
  InstagramPublishContainerNotReady = 'InstagramPublishContainerNotReady',
  InstagramPublishContainerProcessingFailed = 'InstagramPublishContainerProcessingFailed',
  InternalServerError = 'InternalServerError',
  InvalidIgToken = 'InvalidIGToken',
  MetaAdAccountNotFound = 'MetaAdAccountNotFound',
  MetaAdsSyncCooldownPeriodIsActive = 'MetaAdsSyncCooldownPeriodIsActive',
  MetaAdsSyncInProgress = 'MetaAdsSyncInProgress',
  NoAccessToInstagramAccount = 'NoAccessToInstagramAccount',
  NoAccessToTikTokAccount = 'NoAccessToTikTokAccount',
  NoConnectedContactScopeForPlatform = 'NoConnectedContactScopeForPlatform',
  NoPhoneConnectedToBot = 'NoPhoneConnectedToBot',
  NotEnoughPermissions = 'NotEnoughPermissions',
  NumberAlreadyRegisteredInWaba = 'NumberAlreadyRegisteredInWABA',
  OAuthInstagramAccountMismatch = 'OAuthInstagramAccountMismatch',
  PhoneAutoConnectionInProgress = 'PhoneAutoConnectionInProgress',
  PhoneNotVerified = 'PhoneNotVerified',
  PlatformNotSupportedForOperationLink = 'PlatformNotSupportedForOperationLink',
  PlatformOperationLinkInvalidRedirectUrl = 'PlatformOperationLinkInvalidRedirectURL',
  PlatformOperationLinkNotFound = 'PlatformOperationLinkNotFound',
  PreVerifiedBusinessPhoneNumberNotAvailable = 'PreVerifiedBusinessPhoneNumberNotAvailable',
  PreVerifiedBusinessPhoneNumberQuotaExceeded = 'PreVerifiedBusinessPhoneNumberQuotaExceeded',
  PreviewResponsesFuelyAutomationDoesNotExist = 'PreviewResponsesFuelyAutomationDoesNotExist',
  PreviewResponsesFuelyAutomationScopeNotPreviewable = 'PreviewResponsesFuelyAutomationScopeNotPreviewable',
  PublicApiTokenAlreadyExists = 'PublicAPITokenAlreadyExists',
  RuleKeywordDuplicate = 'RuleKeywordDuplicate',
  ScopeNotConnectedToBot = 'ScopeNotConnectedToBot',
  SegmentIsInvalid = 'SegmentIsInvalid',
  SkillDoesNotExist = 'SkillDoesNotExist',
  SpecialistAboutInfoTooLong = 'SpecialistAboutInfoTooLong',
  SpecialistDoesNotExist = 'SpecialistDoesNotExist',
  SpecialistFirstNameRequired = 'SpecialistFirstNameRequired',
  SpecialistFirstNameTooLong = 'SpecialistFirstNameTooLong',
  SpecialistGoogleCalendarLinkDoesNotExist = 'SpecialistGoogleCalendarLinkDoesNotExist',
  SpecialistLastNameTooLong = 'SpecialistLastNameTooLong',
  SpecialistMaxCountReached = 'SpecialistMaxCountReached',
  SpecialistNameNotUnique = 'SpecialistNameNotUnique',
  SpecialistNotEnoughGooglePermissions = 'SpecialistNotEnoughGooglePermissions',
  SpecialistScheduleInvalidTimeFormat = 'SpecialistScheduleInvalidTimeFormat',
  SpecialistScheduleInvalidTimeRange = 'SpecialistScheduleInvalidTimeRange',
  SpecialistScheduleIsEmpty = 'SpecialistScheduleIsEmpty',
  SummarizeChatEntryCountExceededLimit = 'SummarizeChatEntryCountExceededLimit',
  SummarizeChatEntryDescriptionTooLong = 'SummarizeChatEntryDescriptionTooLong',
  SummarizeChatEntryDoesNotExist = 'SummarizeChatEntryDoesNotExist',
  SystemAttributeUpdateNotAllowed = 'SystemAttributeUpdateNotAllowed',
  TaskDoesNotExist = 'TaskDoesNotExist',
  TestRequestConnectionRefused = 'TestRequestConnectionRefused',
  TikTokAccountDoesNotExist = 'TikTokAccountDoesNotExist',
  TooManyBotsInWorkspace = 'TooManyBotsInWorkspace',
  TooManyNumberRegOrDeregAttempts = 'TooManyNumberRegOrDeregAttempts',
  TooManyWorkspaces = 'TooManyWorkspaces',
  TranslationDoesNotExist = 'TranslationDoesNotExist',
  TriggerIsInInvalidState = 'TriggerIsInInvalidState',
  Unauthorized = 'Unauthorized',
  UserAccountDoesNotExist = 'UserAccountDoesNotExist',
  UserAlreadyHasWaProxyContactMapping = 'UserAlreadyHasWAProxyContactMapping',
  UserDefinedSkillDoesNotExist = 'UserDefinedSkillDoesNotExist',
  WaListCannotDeleteLastRow = 'WAListCannotDeleteLastRow',
  WaListInvalidRowsOrdering = 'WAListInvalidRowsOrdering',
  WaListRowNotFound = 'WAListRowNotFound',
  WaListTooManyRows = 'WAListTooManyRows',
  WaPhoneProfilePictureContentTypeNotSupported = 'WAPhoneProfilePictureContentTypeNotSupported',
  WaPhoneProfilePictureSizeTooBig = 'WAPhoneProfilePictureSizeTooBig',
  WebWidgetAvatarColorEmpty = 'WebWidgetAvatarColorEmpty',
  WebWidgetAvatarFileIdEmpty = 'WebWidgetAvatarFileIDEmpty',
  WebWidgetDomainValidationFailed = 'WebWidgetDomainValidationFailed',
  WebWidgetDomainsEmpty = 'WebWidgetDomainsEmpty',
  WebWidgetNameEmpty = 'WebWidgetNameEmpty',
  WebWidgetNameTooLong = 'WebWidgetNameTooLong',
  WhatsAppLinkAlreadyExists = 'WhatsAppLinkAlreadyExists',
  WhatsAppLinkInvalidLength = 'WhatsAppLinkInvalidLength',
  WhatsAppLinkIsNotValid = 'WhatsAppLinkIsNotValid',
  WhatsAppLinkPhoneIsNotValid = 'WhatsAppLinkPhoneIsNotValid',
  WhatsAppOneTimeBroadcastAlreadyStarted = 'WhatsAppOneTimeBroadcastAlreadyStarted',
  WhatsappAdAccountNotFound = 'WhatsappAdAccountNotFound',
  WhatsappPhoneContainsInvalidCharacters = 'WhatsappPhoneContainsInvalidCharacters',
  WhatsappPhoneInvalid = 'WhatsappPhoneInvalid',
  WhatsappPhoneOutsideCharactersLimit = 'WhatsappPhoneOutsideCharactersLimit',
  WorkspaceDoesNotExist = 'WorkspaceDoesNotExist',
  WorkspaceNotEmpty = 'WorkspaceNotEmpty',
  WorkspaceTitleRequired = 'WorkspaceTitleRequired',
  WorkspaceTitleTooLong = 'WorkspaceTitleTooLong',
  WorkspaceTransferInProgress = 'WorkspaceTransferInProgress'
}

export type FacebookAttachmentMessageSendInput = {
  attachment: Scalars['FileID']['input'];
  attachmentType: FacebookSendMessageAttachmentType;
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
};

export enum FacebookBusinessMessagingStatusReason {
  BusinessVerificationNeeded = 'BusinessVerificationNeeded',
  Undefined = 'Undefined'
}

export enum FacebookBusinessVerificationStatus {
  NotVerified = 'NotVerified',
  Pending = 'Pending',
  PendingNeedMoreInfo = 'PendingNeedMoreInfo',
  PendingSubmission = 'PendingSubmission',
  Rejected = 'Rejected',
  Revoked = 'Revoked',
  Undefined = 'Undefined',
  Verified = 'Verified'
}

export enum FacebookBusinessVerificationSubmissionStatus {
  FailedCompletely = 'FailedCompletely',
  Received = 'Received',
  ReviewingByMeta = 'ReviewingByMeta',
  UnderClarification = 'UnderClarification',
  Verified = 'Verified'
}

export enum FacebookMarketingCurrencyCode {
  Aed = 'AED',
  Ars = 'ARS',
  Aud = 'AUD',
  Bdt = 'BDT',
  Bgn = 'BGN',
  Bhd = 'BHD',
  Bob = 'BOB',
  Brl = 'BRL',
  Cad = 'CAD',
  Chf = 'CHF',
  Clp = 'CLP',
  Cny = 'CNY',
  Cop = 'COP',
  Crc = 'CRC',
  Czk = 'CZK',
  Dkk = 'DKK',
  Dzd = 'DZD',
  Egp = 'EGP',
  Eur = 'EUR',
  Fbz = 'FBZ',
  Gbp = 'GBP',
  Gtq = 'GTQ',
  Hkd = 'HKD',
  Hnl = 'HNL',
  Hrk = 'HRK',
  Huf = 'HUF',
  Idr = 'IDR',
  Ils = 'ILS',
  Inr = 'INR',
  Isk = 'ISK',
  Jod = 'JOD',
  Jpy = 'JPY',
  Kes = 'KES',
  Krw = 'KRW',
  Ltl = 'LTL',
  Lvl = 'LVL',
  Mad = 'MAD',
  Mop = 'MOP',
  Mxn = 'MXN',
  Myr = 'MYR',
  Ngn = 'NGN',
  Nio = 'NIO',
  Nok = 'NOK',
  Nzd = 'NZD',
  Pen = 'PEN',
  Php = 'PHP',
  Pkr = 'PKR',
  Pln = 'PLN',
  Pyg = 'PYG',
  Qar = 'QAR',
  Ron = 'RON',
  Rsd = 'RSD',
  Rub = 'RUB',
  Sar = 'SAR',
  Sek = 'SEK',
  Sgd = 'SGD',
  Skk = 'SKK',
  Thb = 'THB',
  Try = 'TRY',
  Twd = 'TWD',
  Uah = 'UAH',
  Usd = 'USD',
  Uyu = 'UYU',
  Vef = 'VEF',
  Ves = 'VES',
  Vnd = 'VND',
  Zar = 'ZAR'
}

export enum FacebookMessageReferralMediaType {
  Image = 'Image',
  Unknown = 'Unknown',
  Video = 'Video'
}

export enum FacebookMessageReferralSourceType {
  Ad = 'Ad',
  Unknown = 'Unknown'
}

export enum FacebookMessageStatus {
  Failed = 'Failed',
  Read = 'Read',
  Sending = 'Sending',
  Sent = 'Sent'
}

export enum FacebookPermissionGroupName {
  AdsRead = 'AdsRead',
  Full = 'Full',
  Minimal = 'Minimal',
  WhatsApp = 'WhatsApp'
}

export enum FacebookSendMessageAttachmentType {
  Audio = 'audio',
  Image = 'image',
  Video = 'video'
}

export type FacebookTextMessageSendInput = {
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
  text: Scalars['String']['input'];
};

export enum FbOAuthType {
  Sdk = 'SDK',
  Redirects = 'redirects'
}

export enum FbPagePostsSyncStatus {
  Finished = 'finished',
  Started = 'started'
}

export enum FbPagesSyncStatus {
  Finished = 'finished',
  Started = 'started'
}

export enum FileStatus {
  DownloadInProgress = 'DownloadInProgress',
  Downloaded = 'Downloaded',
  Expired = 'Expired',
  Failed = 'Failed',
  NotDownloaded = 'NotDownloaded'
}

export enum FileType {
  Audio = 'Audio',
  Document = 'Document',
  Image = 'Image',
  Video = 'Video'
}

export enum FilledWhatsAppTemplateErrorCode {
  CopyCodeButtonCodeValueRequired = 'CopyCodeButtonCodeValueRequired',
  CopyCodeButtonCodeValueTooLong = 'CopyCodeButtonCodeValueTooLong',
  FileRequired = 'FileRequired',
  StatusNotValidForProcessing = 'StatusNotValidForProcessing',
  TextParamRequired = 'TextParamRequired',
  UrlButtonParamRequired = 'URLButtonParamRequired'
}

export enum FilterErrCode {
  AtLeastOneFilterRequired = 'at_least_one_filter_required',
  AttrFilterAttrNameRequired = 'attr_filter_attr_name_required',
  AttrFilterComparableDateRequired = 'attr_filter_comparable_date_required',
  AttrFilterComparableValuesNotAllowed = 'attr_filter_comparable_values_not_allowed',
  AttrFilterComparableValuesRequired = 'attr_filter_comparable_values_required',
  FilterBodyRequired = 'filter_body_required',
  InvalidOperator = 'invalid_operator',
  TooManyFiltersInSegment = 'too_many_filters_in_segment',
  TooManyNestedInFlightSegments = 'too_many_nested_in_flight_segments'
}

export type FilterInput = {
  byAttribute?: InputMaybe<AttrFilterInput>;
  byInFlightSegment?: InputMaybe<SegmentInput>;
  bySegment?: InputMaybe<SegmentFilterInput>;
  byStoredSegment?: InputMaybe<StoredSegmentFilterInput>;
  byTag?: InputMaybe<TagFilterInput>;
  id: Scalars['FilterID']['input'];
};

export enum FlowTourReviewOption {
  HadTroubleCustomerQuestions = 'HadTroubleCustomerQuestions',
  MixedProductServiceInformation = 'MixedProductServiceInformation',
  Other = 'Other',
  SharedIncorrect = 'SharedIncorrect',
  StruggledOrdersBookings = 'StruggledOrdersBookings'
}

export enum FlowTourStep {
  Finished = 'Finished',
  IntroductionToAbout = 'IntroductionToAbout',
  IntroductionToAutomation = 'IntroductionToAutomation',
  IntroductionToCatalog = 'IntroductionToCatalog',
  IntroductionToFaq = 'IntroductionToFaq',
  IntroductionToNextStep = 'IntroductionToNextStep',
  IntroductionToOrdersAndBooking = 'IntroductionToOrdersAndBooking',
  IntroductionToPreviewChat = 'IntroductionToPreviewChat',
  IntroductionToTasks = 'IntroductionToTasks',
  OpenEditorToAutomation = 'OpenEditorToAutomation',
  ReviewAndEditAutomation = 'ReviewAndEditAutomation',
  ReviewAndUpdateAbout = 'ReviewAndUpdateAbout',
  ReviewAndUpdateCatalog = 'ReviewAndUpdateCatalog',
  ReviewAndUpdateFaq = 'ReviewAndUpdateFaq',
  ReviewAndUpdateOrdersAndBooking = 'ReviewAndUpdateOrdersAndBooking',
  Start = 'Start',
  TestingToPreviewChat = 'TestingToPreviewChat'
}

export enum FuelyAutomationScope {
  All = 'All',
  FacebookClickFromAds = 'FacebookClickFromAds',
  FacebookDirectMessages = 'FacebookDirectMessages',
  FacebookMMeLinks = 'FacebookMMeLinks',
  FacebookPostComments = 'FacebookPostComments',
  InstagramAdComments = 'InstagramAdComments',
  InstagramClickFromAds = 'InstagramClickFromAds',
  InstagramDirectMessages = 'InstagramDirectMessages',
  InstagramIgMeLinks = 'InstagramIgMeLinks',
  InstagramPostComments = 'InstagramPostComments',
  InstagramStoryReplies = 'InstagramStoryReplies',
  TikTokClickFromAds = 'TikTokClickFromAds',
  TikTokDirectMessages = 'TikTokDirectMessages',
  TikTokPostComments = 'TikTokPostComments',
  WebWidgetDirectMessage = 'WebWidgetDirectMessage',
  WhatsAppClickFromAds = 'WhatsAppClickFromAds',
  WhatsAppClickFromPosts = 'WhatsAppClickFromPosts',
  WhatsAppDirectMessages = 'WhatsAppDirectMessages'
}

export type FuelyAutomationTemplateInput = {
  baseAutomations?: InputMaybe<Array<FuelyTemplateBaseAutomationInput>>;
  customAutomations?: InputMaybe<Array<FuelyTemplateCustomAutomationInput>>;
};

export enum FuelyBookingAiAutonomyLevel {
  BookingWithHumanApproval = 'BookingWithHumanApproval',
  BookingWithHumanReview = 'BookingWithHumanReview',
  Full = 'Full',
  IntentCollection = 'IntentCollection'
}

export enum FuelyBookingNotificationChannel {
  Chatfuel = 'Chatfuel',
  ConnectedWhatsapp = 'ConnectedWhatsapp'
}

export type FuelyBusinessHoursDayScheduleInput = {
  day: Weekday;
  enabled: Scalars['Boolean']['input'];
  end: Scalars['String']['input'];
  start: Scalars['String']['input'];
};

export type FuelyBusinessHoursScheduleUpdateInput = {
  workingHours?: InputMaybe<Array<FuelyBusinessHoursDayScheduleInput>>;
};

export enum FuelyCollectContactInfoEntryValidationErrorCode {
  AttributeIsDuplicated = 'AttributeIsDuplicated',
  AttributeRequired = 'AttributeRequired',
  DescriptionRequired = 'DescriptionRequired',
  InvalidAttribute = 'InvalidAttribute',
  SystemAttributeIsNotAllowed = 'SystemAttributeIsNotAllowed'
}

export type FuelyConfigBookingAppointmentsUpdateInput = {
  twentyFourHoursAppointment: Scalars['Boolean']['input'];
  twentyFourHoursAppointmentAdditionalInfo?: InputMaybe<Scalars['String']['input']>;
  twoHoursAppointment: Scalars['Boolean']['input'];
  twoHoursAppointmentAdditionalInfo?: InputMaybe<Scalars['String']['input']>;
};

export enum FuelyInitialSetupIndustryCategory {
  Auto = 'Auto',
  Beauty = 'Beauty',
  Education = 'Education',
  Events = 'Events',
  Fitness = 'Fitness',
  Food = 'Food',
  Healthcare = 'Healthcare',
  Home = 'Home',
  Other = 'Other',
  Pets = 'Pets',
  RealEstate = 'RealEstate',
  Retail = 'Retail',
  Wellness = 'Wellness'
}

export enum FuelyInitialSetupIndustryHealthcareSubCategory {
  Aesthetic = 'Aesthetic',
  Cardiology = 'Cardiology',
  Dentistry = 'Dentistry',
  Dermatology = 'Dermatology',
  Endocrinology = 'Endocrinology',
  Gynecology = 'Gynecology',
  Mental = 'Mental',
  Multidisciplinary = 'Multidisciplinary',
  Neurology = 'Neurology',
  Oncology = 'Oncology',
  Ophthalmology = 'Ophthalmology',
  Orthopedics = 'Orthopedics',
  Other = 'Other',
  Otolaryngology = 'Otolaryngology',
  Pediatrics = 'Pediatrics',
  Surgery = 'Surgery'
}

export type FuelyInitialSetupIndustryInput = {
  category: FuelyInitialSetupIndustryCategory;
  healthcareSubCategory?: InputMaybe<FuelyInitialSetupIndustryHealthcareSubCategory>;
  wellnessSubCategory?: InputMaybe<FuelyInitialSetupIndustryWellnessSubCategory>;
};

export enum FuelyInitialSetupIndustryWellnessSubCategory {
  Aesthetic = 'Aesthetic',
  Breathwork = 'Breathwork',
  Chiropractor = 'Chiropractor',
  HealthCoach = 'HealthCoach',
  Herbalist = 'Herbalist',
  HolisticHealthCoach = 'HolisticHealthCoach',
  IntegrativeMedicine = 'IntegrativeMedicine',
  Massage = 'Massage',
  Mindfulness = 'Mindfulness',
  Naturopath = 'Naturopath',
  Nutritionist = 'Nutritionist',
  Osteopath = 'Osteopath',
  Other = 'Other'
}

export type FuelyInitialSetupPreviewChatInput = {
  messages: Array<FuelyInitialSetupPreviewChatMessageInput>;
};

export type FuelyInitialSetupPreviewChatMessageInput = {
  direction: FuelyInitialSetupPreviewChatMsgDirection;
  reaction?: InputMaybe<FuelyInitialSetupPreviewChatMsgReaction>;
  text: Scalars['String']['input'];
};

export enum FuelyInitialSetupPreviewChatMsgDirection {
  In = 'In',
  Out = 'Out'
}

export enum FuelyInitialSetupPreviewChatMsgReaction {
  Dislike = 'Dislike',
  Like = 'Like'
}

export enum FuelyInitialSetupStep {
  CompanyInfoStep = 'CompanyInfoStep',
  Completed = 'Completed',
  FuelyCustomizingStep = 'FuelyCustomizingStep',
  TestingStep = 'TestingStep'
}

export type FuelyKnowledgeBaseFaqInput = {
  answer: Scalars['String']['input'];
  question: Scalars['String']['input'];
};

export enum FuelySettingBookingRulesAutonomyLevel {
  BookWithFullAutonomy = 'BookWithFullAutonomy',
  BookWithTeammatesApproval = 'BookWithTeammatesApproval',
  BookWithTeammatesReview = 'BookWithTeammatesReview',
  CollectIntents = 'CollectIntents',
  DontBook = 'DontBook'
}

export type FuelySettingBookingRulesInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingBookingRulesUpdateInput>;
};

export type FuelySettingBookingRulesUpdateInput = {
  autonomyLevel: FuelySettingBookingRulesAutonomyLevel;
};

export type FuelySettingCatalogImagesInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingCatalogImagesUpdateInput>;
};

export type FuelySettingCatalogImagesUpdateInput = {
  imagesPerCatalogItem: Scalars['Int']['input'];
  whenToShow: FuelySettingCatalogImagesWhenToShow;
};

export enum FuelySettingCatalogImagesWhenToShow {
  Never = 'Never',
  OnceMentioned = 'OnceMentioned',
  WhenAsked = 'WhenAsked'
}

export type FuelySettingCollectContactInfoEntryInput = {
  description: Scalars['String']['input'];
  name: Scalars['AttributeName']['input'];
};

export enum FuelySettingCollectContactInfoHowToCollect {
  CollectInfo = 'CollectInfo',
  DoNotCollectInfo = 'DoNotCollectInfo'
}

export type FuelySettingCollectContactInfoInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingCollectContactInfoUpdateInput>;
};

export type FuelySettingCollectContactInfoUpdateInput = {
  captures: Array<FuelySettingCollectContactInfoEntryInput>;
  howToCollect: FuelySettingCollectContactInfoHowToCollect;
};

export enum FuelySettingFollowUpsHowToSend {
  DontSend = 'DontSend',
  Send = 'Send'
}

export type FuelySettingFollowUpsInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingFollowUpsUpdateInput>;
};

export type FuelySettingFollowUpsUpdateInput = {
  howToSend: FuelySettingFollowUpsHowToSend;
  messagePrompt: Scalars['String']['input'];
};

export enum FuelySettingIncomingMessagesHowToReply {
  DontReply = 'DontReply',
  UsingAi = 'UsingAI'
}

export type FuelySettingIncomingMessagesInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingIncomingMessagesUpdateInput>;
};

export type FuelySettingIncomingMessagesUpdateInput = {
  howToReply: FuelySettingIncomingMessagesHowToReply;
  messagePrompt: Scalars['String']['input'];
};

export type FuelySettingKeywordsInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingKeywordsUpdateInput>;
};

export enum FuelySettingKeywordsReactTo {
  AnyComment = 'AnyComment',
  CommentThatContains = 'CommentThatContains',
  CommentThatDoesNotContain = 'CommentThatDoesNotContain',
  CommentThatExactlyMatches = 'CommentThatExactlyMatches'
}

export type FuelySettingKeywordsUpdateInput = {
  keywords: Array<Scalars['String']['input']>;
  reactTo: FuelySettingKeywordsReactTo;
};

export type FuelySettingListOfAdsInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingListOfAdsUpdateInput>;
};

export type FuelySettingListOfAdsUpdateInput = {
  adIDs: Array<Scalars['AdID']['input']>;
};

export type FuelySettingListOfPostsInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingListOfPostsUpdateInput>;
};

export type FuelySettingListOfPostsUpdateInput = {
  postIDs: Array<Scalars['PostID']['input']>;
};

export type FuelySettingListOfStoriesInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingListOfStoriesUpdateInput>;
};

export type FuelySettingListOfStoriesUpdateInput = {
  storyIDs: Array<Scalars['StoryID']['input']>;
};

export type FuelySettingMessageDelaysInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingMessageDelaysUpdateInput>;
};

export type FuelySettingMessageDelaysUpdateInput = {
  enabled: Scalars['Boolean']['input'];
};

export enum FuelySettingPrivateReplyHowToReply {
  DontReply = 'DontReply',
  ExactText = 'ExactText',
  UsingAi = 'UsingAI'
}

export type FuelySettingPrivateReplyInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingPrivateReplyUpdateInput>;
};

export type FuelySettingPrivateReplyUpdateInput = {
  exactTextReply: Scalars['String']['input'];
  messagePrompt: Scalars['String']['input'];
  privateReplyHowToReply: FuelySettingPrivateReplyHowToReply;
};

export enum FuelySettingPublicReplyHowToReply {
  DontReply = 'DontReply',
  ExactText = 'ExactText',
  UsingAi = 'UsingAI'
}

export type FuelySettingPublicReplyInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingPublicReplyUpdateInput>;
};

export type FuelySettingPublicReplyUpdateInput = {
  exactTextReply: Scalars['String']['input'];
  likeContactComment: Scalars['Boolean']['input'];
  messagePrompt: Scalars['String']['input'];
  publicReplyHowToReply: FuelySettingPublicReplyHowToReply;
};

export type FuelySettingRefLinksInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingRefLinksUpdateInput>;
};

export type FuelySettingRefLinksUpdateInput = {
  refs: Array<Scalars['String']['input']>;
};

export type FuelySettingSendEventsToMetaEventInput = {
  onBooking?: InputMaybe<FuelySettingSendEventsToMetaOnBookingEventInput>;
  onContactAttribute?: InputMaybe<FuelySettingSendEventsToMetaOnContactAttributeEventInput>;
  onContactFirstMessage?: InputMaybe<FuelySettingSendEventsToMetaOnContactFirstMessageEventInput>;
  onContactMessageKeyword?: InputMaybe<FuelySettingSendEventsToMetaOnContactMessageKeywordEventInput>;
  onCustomPrompt?: InputMaybe<FuelySettingSendEventsToMetaOnCustomPromptEventInput>;
  onSalesStage?: InputMaybe<FuelySettingSendEventsToMetaOnSalesStageEventInput>;
  onSwitchToHuman?: InputMaybe<FuelySettingSendEventsToMetaOnSwitchToHumanEventInput>;
};

export type FuelySettingSendEventsToMetaEventNameInput = {
  customName?: InputMaybe<Scalars['String']['input']>;
  standardName?: InputMaybe<FuelySettingSendEventsToMetaStandardEventName>;
};

export type FuelySettingSendEventsToMetaInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingSendEventsToMetaUpdateInput>;
};

export enum FuelySettingSendEventsToMetaKeywordsRule {
  Contains = 'Contains',
  ExactMatch = 'ExactMatch'
}

export type FuelySettingSendEventsToMetaOnBookingEventInput = {
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
};

export type FuelySettingSendEventsToMetaOnContactAttributeEventInput = {
  attributeCondition: AttrFilterInput;
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
};

export type FuelySettingSendEventsToMetaOnContactFirstMessageEventInput = {
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
};

export type FuelySettingSendEventsToMetaOnContactMessageKeywordEventInput = {
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
  keywords: Array<Scalars['String']['input']>;
  keywordsRule: FuelySettingSendEventsToMetaKeywordsRule;
};

export type FuelySettingSendEventsToMetaOnCustomPromptEventInput = {
  conditionPrompt: Scalars['String']['input'];
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
};

export type FuelySettingSendEventsToMetaOnSalesStageEventInput = {
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
  salesStages: Array<FuelySettingSendEventsToMetaSalesStage>;
};

export type FuelySettingSendEventsToMetaOnSwitchToHumanEventInput = {
  eventName: FuelySettingSendEventsToMetaEventNameInput;
  id?: InputMaybe<Scalars['FuelySettingSendEventsToMetaEventID']['input']>;
  switchToHumanFrom: Array<FuelySettingSendEventsToMetaSwitchToHumanFrom>;
};

export enum FuelySettingSendEventsToMetaSalesStage {
  Lost = 'Lost',
  Ready = 'Ready',
  Sorting = 'Sorting',
  Won = 'Won',
  WorkingOn = 'WorkingOn'
}

export enum FuelySettingSendEventsToMetaStandardEventName {
  AddToCart = 'AddToCart',
  CartAbandoned = 'CartAbandoned',
  InitiateCheckout = 'InitiateCheckout',
  LeadSubmitted = 'LeadSubmitted',
  OrderCanceled = 'OrderCanceled',
  OrderCreated = 'OrderCreated',
  OrderDelivered = 'OrderDelivered',
  OrderReturned = 'OrderReturned',
  OrderShipped = 'OrderShipped',
  Purchase = 'Purchase',
  QualifiedLead = 'QualifiedLead',
  RatingProvided = 'RatingProvided',
  ReviewProvided = 'ReviewProvided',
  ViewContent = 'ViewContent'
}

export enum FuelySettingSendEventsToMetaSwitchToHumanFrom {
  FuelyAi = 'FuelyAI',
  UserAccount = 'UserAccount'
}

export type FuelySettingSendEventsToMetaUpdateInput = {
  events: Array<FuelySettingSendEventsToMetaEventInput>;
};

export enum FuelySettingSwitchToHumanHowToSwitch {
  DontSwitch = 'DontSwitch',
  SwitchToTeammates = 'SwitchToTeammates'
}

export type FuelySettingSwitchToHumanInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingSwitchToHumanUpdateInput>;
};

export type FuelySettingSwitchToHumanRuleAssigneeInput = {
  userID: Scalars['UserAccountID']['input'];
};

export type FuelySettingSwitchToHumanRuleInput = {
  assignees?: InputMaybe<Array<FuelySettingSwitchToHumanRuleAssigneeInput>>;
  messagePrompt: Scalars['String']['input'];
  switchingConditions: Scalars['String']['input'];
};

export type FuelySettingSwitchToHumanUpdateInput = {
  howToSwitch: FuelySettingSwitchToHumanHowToSwitch;
  rules: Array<FuelySettingSwitchToHumanRuleInput>;
};

export type FuelySettingUpdateInput = {
  bookingRules?: InputMaybe<FuelySettingBookingRulesInput>;
  catalogImages?: InputMaybe<FuelySettingCatalogImagesInput>;
  collectContactInfo?: InputMaybe<FuelySettingCollectContactInfoInput>;
  followUps?: InputMaybe<FuelySettingFollowUpsInput>;
  incomingMessages?: InputMaybe<FuelySettingIncomingMessagesInput>;
  keywords?: InputMaybe<FuelySettingKeywordsInput>;
  listOfAds?: InputMaybe<FuelySettingListOfAdsInput>;
  listOfPosts?: InputMaybe<FuelySettingListOfPostsInput>;
  listOfStories?: InputMaybe<FuelySettingListOfStoriesInput>;
  messageDelays?: InputMaybe<FuelySettingMessageDelaysInput>;
  privateReply?: InputMaybe<FuelySettingPrivateReplyInput>;
  publicReply?: InputMaybe<FuelySettingPublicReplyInput>;
  refLinks?: InputMaybe<FuelySettingRefLinksInput>;
  sendEventsToMeta?: InputMaybe<FuelySettingSendEventsToMetaInput>;
  switchToHuman?: InputMaybe<FuelySettingSwitchToHumanInput>;
  whenAIReplies?: InputMaybe<FuelySettingWhenAiRepliesInput>;
};

export type FuelySettingWhenAiRepliesInput = {
  setInheritFrom?: InputMaybe<Scalars['FuelyAutomationID']['input']>;
  setInheritFromScope?: InputMaybe<FuelyAutomationScope>;
  update?: InputMaybe<FuelySettingWhenAiRepliesUpdateInput>;
};

export enum FuelySettingWhenAiRepliesOptions {
  Always = 'Always',
  OutsideOfWorkingHours = 'OutsideOfWorkingHours'
}

export type FuelySettingWhenAiRepliesUpdateInput = {
  option: FuelySettingWhenAiRepliesOptions;
};

export type FuelyTemplateBaseAutomationInput = {
  scope: FuelyAutomationScope;
  settings: Array<FuelySettingUpdateInput>;
};

export type FuelyTemplateCustomAutomationInput = {
  name: Scalars['String']['input'];
  scope: FuelyAutomationScope;
  settings: Array<FuelySettingUpdateInput>;
};

export enum GoodsItemPriceCurrency {
  Aed = 'AED',
  Afn = 'AFN',
  All = 'ALL',
  Amd = 'AMD',
  Ang = 'ANG',
  Aoa = 'AOA',
  Ars = 'ARS',
  Aud = 'AUD',
  Awg = 'AWG',
  Azn = 'AZN',
  Bam = 'BAM',
  Bbd = 'BBD',
  Bdt = 'BDT',
  Bgn = 'BGN',
  Bif = 'BIF',
  Bmd = 'BMD',
  Bnd = 'BND',
  Bob = 'BOB',
  Brl = 'BRL',
  Bsd = 'BSD',
  Bwp = 'BWP',
  Bzd = 'BZD',
  Cad = 'CAD',
  Cdf = 'CDF',
  Chf = 'CHF',
  Clp = 'CLP',
  Cny = 'CNY',
  Cop = 'COP',
  Crc = 'CRC',
  Cve = 'CVE',
  Czk = 'CZK',
  Djf = 'DJF',
  Dkk = 'DKK',
  Dop = 'DOP',
  Dzd = 'DZD',
  Egp = 'EGP',
  Etb = 'ETB',
  Eur = 'EUR',
  Fjd = 'FJD',
  Fkp = 'FKP',
  Gbp = 'GBP',
  Gel = 'GEL',
  Gip = 'GIP',
  Gmd = 'GMD',
  Gnf = 'GNF',
  Gtq = 'GTQ',
  Gyd = 'GYD',
  Hkd = 'HKD',
  Hnl = 'HNL',
  Htg = 'HTG',
  Huf = 'HUF',
  Idr = 'IDR',
  Ils = 'ILS',
  Inr = 'INR',
  Isk = 'ISK',
  Jmd = 'JMD',
  Jpy = 'JPY',
  Kes = 'KES',
  Kgs = 'KGS',
  Khr = 'KHR',
  Kmf = 'KMF',
  Krw = 'KRW',
  Kyd = 'KYD',
  Kzt = 'KZT',
  Lak = 'LAK',
  Lbp = 'LBP',
  Lkr = 'LKR',
  Lrd = 'LRD',
  Lsl = 'LSL',
  Mad = 'MAD',
  Mdl = 'MDL',
  Mga = 'MGA',
  Mkd = 'MKD',
  Mmk = 'MMK',
  Mnt = 'MNT',
  Mop = 'MOP',
  Mur = 'MUR',
  Mvr = 'MVR',
  Mwk = 'MWK',
  Mxn = 'MXN',
  Myr = 'MYR',
  Mzn = 'MZN',
  Nad = 'NAD',
  Ngn = 'NGN',
  Nio = 'NIO',
  Nok = 'NOK',
  Npr = 'NPR',
  Nzd = 'NZD',
  Pab = 'PAB',
  Pen = 'PEN',
  Pgk = 'PGK',
  Php = 'PHP',
  Pkr = 'PKR',
  Pln = 'PLN',
  Pyg = 'PYG',
  Qar = 'QAR',
  Ron = 'RON',
  Rsd = 'RSD',
  Rwf = 'RWF',
  Sar = 'SAR',
  Sbd = 'SBD',
  Scr = 'SCR',
  Sek = 'SEK',
  Sgd = 'SGD',
  Shp = 'SHP',
  Sle = 'SLE',
  Sos = 'SOS',
  Srd = 'SRD',
  Std = 'STD',
  Szl = 'SZL',
  Thb = 'THB',
  Tjs = 'TJS',
  Top = 'TOP',
  Try = 'TRY',
  Ttd = 'TTD',
  Twd = 'TWD',
  Tzs = 'TZS',
  Uah = 'UAH',
  Ugx = 'UGX',
  Usd = 'USD',
  Uyu = 'UYU',
  Uzs = 'UZS',
  Vnd = 'VND',
  Vuv = 'VUV',
  Wst = 'WST',
  Xaf = 'XAF',
  Xcd = 'XCD',
  Xcg = 'XCG',
  Xof = 'XOF',
  Xpf = 'XPF',
  Yer = 'YER',
  Zar = 'ZAR',
  Zmw = 'ZMW'
}

export type GoodsItemPriceInput = {
  amount: Scalars['String']['input'];
  currency: GoodsItemPriceCurrency;
};

export type GoodsProductInput = {
  description: Scalars['String']['input'];
  images: Array<Scalars['FileID']['input']>;
  isAvailable: Scalars['Boolean']['input'];
  price?: InputMaybe<GoodsItemPriceInput>;
  title: Scalars['String']['input'];
};

export type GoodsServiceInput = {
  description: Scalars['String']['input'];
  durationSeconds: Scalars['Int']['input'];
  images: Array<Scalars['FileID']['input']>;
  isAvailable: Scalars['Boolean']['input'];
  price?: InputMaybe<GoodsItemPriceInput>;
  title: Scalars['String']['input'];
};

export type InstagramAttachmentMessageSendInput = {
  attachment: Scalars['FileID']['input'];
  attachmentType: InstagramSendMessageAttachmentType;
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
};

export enum InstagramCarouselItemMediaType {
  Image = 'Image',
  Video = 'Video'
}

export enum InstagramMessageReferralMediaType {
  Image = 'Image',
  Unknown = 'Unknown',
  Video = 'Video'
}

export enum InstagramMessageReferralSourceType {
  Ad = 'Ad',
  Unknown = 'Unknown'
}

export enum InstagramMessageStatus {
  Failed = 'Failed',
  Read = 'Read',
  Sending = 'Sending',
  Sent = 'Sent'
}

export enum InstagramPermission {
  InstagramBusinessBasic = 'InstagramBusinessBasic',
  InstagramBusinessContentPublish = 'InstagramBusinessContentPublish',
  InstagramBusinessManageComments = 'InstagramBusinessManageComments',
  InstagramBusinessManageInsights = 'InstagramBusinessManageInsights',
  InstagramBusinessManageMessages = 'InstagramBusinessManageMessages'
}

export enum InstagramPermissionGroupName {
  Full = 'Full',
  Minimal = 'Minimal'
}

export type InstagramPublishCarouselInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  items: Array<InstagramPublishCarouselItemInput>;
};

export type InstagramPublishCarouselItemInput = {
  mediaType: InstagramCarouselItemMediaType;
  mediaURL: Scalars['String']['input'];
};

export type InstagramPublishImageInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  imageURL: Scalars['String']['input'];
};

export type InstagramPublishReelInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  coverURL?: InputMaybe<Scalars['String']['input']>;
  shareToFeed?: InputMaybe<Scalars['Boolean']['input']>;
  thumbOffset?: InputMaybe<Scalars['Int']['input']>;
  videoURL: Scalars['String']['input'];
};

export type InstagramPublishStoryInput = {
  mediaType: InstagramStoryMediaType;
  mediaURL: Scalars['String']['input'];
};

export enum InstagramSendMessageAttachmentType {
  Audio = 'audio',
  Image = 'image',
  Video = 'video'
}

export enum InstagramStoryMediaType {
  Image = 'Image',
  Video = 'Video'
}

export type InstagramTextMessageSendInput = {
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
  text: Scalars['String']['input'];
};

export enum InviteType {
  Bot = 'Bot',
  Workspace = 'Workspace'
}

export enum KeywordRuleActionType {
  DoNothing = 'doNothing',
  SendMessage = 'sendMessage',
  SwitchToFlow = 'switchToFlow'
}

export enum KeywordRuleMatchType {
  Contains = 'contains',
  Matches = 'matches',
  SimilarTo = 'similarTo'
}

export enum LivechatAutoClosingConfigDelay {
  Days3 = 'Days3',
  Days7 = 'Days7',
  Hours1 = 'Hours1',
  Hours5 = 'Hours5',
  Hours24 = 'Hours24',
  Minutes10 = 'Minutes10',
  Minutes30 = 'Minutes30'
}

export type LivechatAutoClosingConfigUpdateInput = {
  delay: LivechatAutoClosingConfigDelay;
  enabled: Scalars['Boolean']['input'];
};

export enum MessageErrorCode {
  InstagramOutMessageOutsideAllowedWindow = 'InstagramOutMessageOutsideAllowedWindow',
  MessageUnknownError = 'MessageUnknownError',
  TikTokOutMessageOutsideAllowedWindow = 'TikTokOutMessageOutsideAllowedWindow',
  TikTokOutMessageViolatesCommunityGuidelines = 'TikTokOutMessageViolatesCommunityGuidelines',
  TikTokOutProhibitedMediaStrategy = 'TikTokOutProhibitedMediaStrategy',
  WhatsAppOutApiService = 'WhatsAppOutAPIService',
  WhatsAppOutApiUnknown = 'WhatsAppOutAPIUnknown',
  WhatsAppOutAccountHasBeenLocked = 'WhatsAppOutAccountHasBeenLocked',
  WhatsAppOutAccountInMaintenanceMode = 'WhatsAppOutAccountInMaintenanceMode',
  WhatsAppOutBusinessEligibilityPayment = 'WhatsAppOutBusinessEligibilityPayment',
  WhatsAppOutGenericUserError = 'WhatsAppOutGenericUserError',
  WhatsAppOutMediaUploadError = 'WhatsAppOutMediaUploadError',
  WhatsAppOutMessageUndeliverable = 'WhatsAppOutMessageUndeliverable',
  WhatsAppOutMetaChooseNotToDeliver = 'WhatsAppOutMetaChooseNotToDeliver',
  WhatsAppOutMoreThan24hPassed = 'WhatsAppOutMoreThan24hPassed',
  WhatsAppOutNumberNeedsDisplayNameApproval = 'WhatsAppOutNumberNeedsDisplayNameApproval',
  WhatsAppOutPairRateLimitHit = 'WhatsAppOutPairRateLimitHit',
  WhatsAppOutParameterValueIsNotValid = 'WhatsAppOutParameterValueIsNotValid',
  WhatsAppOutRateLimitHit = 'WhatsAppOutRateLimitHit',
  WhatsAppOutRecipientCannotBeSender = 'WhatsAppOutRecipientCannotBeSender',
  WhatsAppOutRequiredParameterIsMissing = 'WhatsAppOutRequiredParameterIsMissing',
  WhatsAppOutRestrictedFromMessagingUsersInThisCountry = 'WhatsAppOutRestrictedFromMessagingUsersInThisCountry',
  WhatsAppOutServiceUnavailable = 'WhatsAppOutServiceUnavailable',
  WhatsAppOutSomethingWentWrong = 'WhatsAppOutSomethingWentWrong',
  WhatsAppOutSpamRateLimitHit = 'WhatsAppOutSpamRateLimitHit',
  WhatsAppOutTemplateDisabled = 'WhatsAppOutTemplateDisabled',
  WhatsAppOutTemplateDoesNotExist = 'WhatsAppOutTemplateDoesNotExist',
  WhatsAppOutTemplateFormatCharacterPoliceViolated = 'WhatsAppOutTemplateFormatCharacterPoliceViolated',
  WhatsAppOutTemplateIsPaused = 'WhatsAppOutTemplateIsPaused',
  WhatsAppOutTemplateVoiceCallButtonNotEnabledForCalling = 'WhatsAppOutTemplateVoiceCallButtonNotEnabledForCalling',
  WhatsAppOutTemporaryBlockedForPoliciesViolations = 'WhatsAppOutTemporaryBlockedForPoliciesViolations',
  WhatsAppOutUsersNumberIsNotPartOfAnExperiment = 'WhatsAppOutUsersNumberIsNotPartOfAnExperiment'
}

export enum MetaAdEffectiveStatus {
  Active = 'Active',
  AdSetPaused = 'AdSetPaused',
  Archived = 'Archived',
  CampaignPaused = 'CampaignPaused',
  Deleted = 'Deleted',
  Disapproved = 'Disapproved',
  InProgress = 'InProgress',
  Paused = 'Paused',
  PendingBillingInfo = 'PendingBillingInfo',
  PendingReview = 'PendingReview',
  PreApproved = 'PreApproved',
  WithIssues = 'WithIssues'
}

export enum PermissionAllowedAction {
  Edit = 'Edit',
  None = 'None',
  View = 'View'
}

export type PermissionInput = {
  action: PermissionAllowedAction;
  object: PermissionObject;
};

export enum PermissionObject {
  Ai = 'Ai',
  Analyze = 'Analyze',
  Bot = 'Bot',
  Broadcasting = 'Broadcasting',
  Configure = 'Configure',
  ContactsAssignedToOthers = 'ContactsAssignedToOthers',
  ContactsUnassigned = 'ContactsUnassigned',
  Flows = 'Flows',
  Home = 'Home',
  Inbox = 'Inbox',
  People = 'People',
  Pro = 'Pro',
  Roles = 'Roles',
  Workspaces = 'Workspaces'
}

export enum Platform {
  Facebook = 'facebook',
  Instagram = 'instagram',
  Tiktok = 'tiktok',
  Whatsapp = 'whatsapp',
  Widget = 'widget'
}

export enum PlatformOperationLinkPlatform {
  Instagram = 'instagram',
  Tiktok = 'tiktok',
  Whatsapp = 'whatsapp'
}

export type PreviewResponsesBtnClickInput = {
  buttonTitle: Scalars['String']['input'];
  clientId?: InputMaybe<Scalars['String']['input']>;
  messageId: Scalars['MessageID']['input'];
};

export type PreviewResponsesWaListRowClickInput = {
  clientId?: InputMaybe<Scalars['String']['input']>;
  messageId: Scalars['MessageID']['input'];
  rowTitle: Scalars['String']['input'];
};

export type RoleSettingsInput = {
  allowContactsWithEmptyAssignee: Scalars['Boolean']['input'];
  allowOnlyAssignedToMeContacts: Scalars['Boolean']['input'];
};

export type RolesConfigInput = {
  agentRoleSettings: RoleSettingsInput;
  editorRoleSettings: RoleSettingsInput;
};

export enum SalesStageV2 {
  Lost = 'Lost',
  New = 'New',
  Ready = 'Ready',
  Sorting = 'Sorting',
  Won = 'Won',
  WorkingOn = 'WorkingOn'
}

export type SegmentFilterInput = {
  operator: SegmentFilterOperator;
  segmentIDs: Array<Scalars['SegmentID']['input']>;
};

export enum SegmentFilterOperator {
  Is = 'IS',
  IsNot = 'IS_NOT'
}

export type SegmentInput = {
  filters: Array<FilterInput>;
  id: Scalars['SegmentID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  resultOperator: BoolOperator;
};

export enum SendJsonHttpMethod {
  Delete = 'DELETE',
  Get = 'GET',
  Patch = 'PATCH',
  Post = 'POST',
  Put = 'PUT'
}

export enum SendJsonPayloadType {
  AllProperties = 'ALL_PROPERTIES',
  CustomRequest = 'CUSTOM_REQUEST',
  EncodedUrl = 'ENCODED_URL'
}

export enum Sort {
  Asc = 'Asc',
  Desc = 'Desc'
}

export type SpecialistDayScheduleBreakInput = {
  end: Scalars['SpecialistScheduleTime']['input'];
  start: Scalars['SpecialistScheduleTime']['input'];
};

export type SpecialistDayScheduleInput = {
  break?: InputMaybe<SpecialistDayScheduleBreakInput>;
  enabled: Scalars['Boolean']['input'];
  end: Scalars['SpecialistScheduleTime']['input'];
  start: Scalars['SpecialistScheduleTime']['input'];
};

export type SpecialistInfoInput = {
  goodsServices: Array<Scalars['GoodsItemID']['input']>;
  profile: SpecialistProfileInput;
  schedule: SpecialistScheduleInput;
};

export type SpecialistProfileInput = {
  aboutInfo?: InputMaybe<Scalars['String']['input']>;
  firstName: Scalars['String']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['FileID']['input']>;
};

export type SpecialistScheduleInput = {
  enabled: Scalars['Boolean']['input'];
  fri?: InputMaybe<SpecialistDayScheduleInput>;
  mon?: InputMaybe<SpecialistDayScheduleInput>;
  sat?: InputMaybe<SpecialistDayScheduleInput>;
  sun?: InputMaybe<SpecialistDayScheduleInput>;
  thu?: InputMaybe<SpecialistDayScheduleInput>;
  tue?: InputMaybe<SpecialistDayScheduleInput>;
  wed?: InputMaybe<SpecialistDayScheduleInput>;
};

export type StoredSegmentFilterInput = {
  operator: StoredSegmentFilterOperator;
  segmentIDs: Array<Scalars['SegmentID']['input']>;
};

export enum StoredSegmentFilterOperator {
  Is = 'IS',
  IsNot = 'IS_NOT'
}

export type TagFilterInput = {
  operator: TagFilterOperator;
  tagNames: Array<Scalars['String']['input']>;
};

export enum TagFilterOperator {
  Is = 'IS',
  IsNot = 'IS_NOT'
}

export enum TaskStatusType {
  Cancelled = 'Cancelled',
  Created = 'Created',
  Failed = 'Failed',
  Finished = 'Finished',
  InProgress = 'InProgress',
  Paused = 'Paused'
}

export enum TeamMemberRemovalWarning {
  FuelySwitchToHumanAssignee = 'FuelySwitchToHumanAssignee'
}

export type TikTokAttachmentMessageSendInput = {
  attachment: Scalars['FileID']['input'];
  attachmentType: TikTokSendMessageAttachmentType;
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
};

export enum TikTokMessageStatus {
  Failed = 'Failed',
  Read = 'Read',
  Sending = 'Sending',
  Sent = 'Sent'
}

export enum TikTokPermissionGroupName {
  Full = 'Full',
  Minimal = 'Minimal'
}

export enum TikTokSendMessageAttachmentType {
  Image = 'image'
}

export type TikTokTextMessageSendInput = {
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
  text: Scalars['String']['input'];
};

export enum TriggerConditionType {
  ContactAttributeChanged = 'ContactAttributeChanged',
  LastMessageFromContact = 'LastMessageFromContact'
}

export type TriggerDelayInput = {
  unit: TriggerDelayUnit;
  value: Scalars['Long']['input'];
};

export enum TriggerDelayUnit {
  Days = 'Days',
  Hours = 'Hours',
  Immediately = 'Immediately',
  Minutes = 'Minutes',
  Seconds = 'Seconds'
}

export enum TriggerValidationErrorCode {
  AttrConditionInvalid = 'AttrConditionInvalid',
  AttrConditionRequired = 'AttrConditionRequired',
  DelayTooLong = 'DelayTooLong',
  DelayTooShort = 'DelayTooShort'
}

export type UndefinedTargetBlockConnectionCreateRequest = {
  sourceBlockElementID?: InputMaybe<Scalars['BlockElementID']['input']>;
  sourceBlockID: Scalars['BlockID']['input'];
  sourceHandleID?: InputMaybe<Scalars['ComponentHandleID']['input']>;
};

export enum WebWidgetAttachmentType {
  Image = 'image'
}

export enum WebWidgetMessageStatus {
  Seen = 'Seen',
  Sending = 'Sending',
  Unseen = 'Unseen'
}

export enum Weekday {
  Fri = 'Fri',
  Mon = 'Mon',
  Sat = 'Sat',
  Sun = 'Sun',
  Thu = 'Thu',
  Tue = 'Tue',
  Wed = 'Wed'
}

export type WhatsAppAttachmentMessageSendInput = {
  attachment: Scalars['FileID']['input'];
  attachmentName?: InputMaybe<Scalars['String']['input']>;
  attachmentType: WhatsAppSendMessageAttachmentType;
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
};

export enum WhatsAppBusinessAccountMessagingStatusReason {
  Banned = 'Banned',
  PaymentMethodMissing = 'PaymentMethodMissing',
  Undefined = 'Undefined'
}

export enum WhatsAppMessageReferralMediaType {
  Image = 'Image',
  Unknown = 'Unknown',
  Video = 'Video'
}

export enum WhatsAppMessageReferralSourceType {
  Ad = 'Ad',
  Post = 'Post',
  Unknown = 'Unknown'
}

export enum WhatsAppMessageStatus {
  Delivered = 'Delivered',
  Failed = 'Failed',
  Read = 'Read',
  Sending = 'Sending',
  Sent = 'Sent'
}

export enum WhatsAppPhoneBizAppMessagingHistoryAccess {
  Accepted = 'accepted',
  Declined = 'declined',
  Unknown = 'unknown'
}

export enum WhatsAppPhoneCodeVerificationStatus {
  Expired = 'Expired',
  NotVerified = 'NotVerified',
  Verified = 'Verified'
}

export enum WhatsAppPhoneMessagingStatusReason {
  CustomersBlockingYourPhoneNumber = 'CustomersBlockingYourPhoneNumber',
  DisplayNameNotApproved = 'DisplayNameNotApproved',
  Undefined = 'Undefined'
}

export enum WhatsAppPhoneStatus {
  Banned = 'Banned',
  Connected = 'Connected',
  Deleted = 'Deleted',
  Disconnected = 'Disconnected',
  Flagged = 'Flagged',
  Migrated = 'Migrated',
  Pending = 'Pending',
  RateLimited = 'RateLimited',
  Restricted = 'Restricted',
  Unknown = 'Unknown',
  Unverified = 'Unverified'
}

export enum WhatsAppSendMessageAttachmentType {
  Audio = 'audio',
  Document = 'document',
  Image = 'image'
}

export enum WhatsAppTemplateCategory {
  AccountUpdate = 'AccountUpdate',
  AlertUpdate = 'AlertUpdate',
  AppointmentUpdate = 'AppointmentUpdate',
  Authentication = 'Authentication',
  AutoReply = 'AutoReply',
  IssueResolution = 'IssueResolution',
  Marketing = 'Marketing',
  Otp = 'OTP',
  PaymentUpdate = 'PaymentUpdate',
  PersonalFinanceUpdate = 'PersonalFinanceUpdate',
  ReservationUpdate = 'ReservationUpdate',
  ShippingUpdate = 'ShippingUpdate',
  TicketUpdate = 'TicketUpdate',
  Transactional = 'Transactional',
  TransportationUpdate = 'TransportationUpdate',
  Utility = 'Utility'
}

export enum WhatsAppTemplateComponentType {
  Body = 'Body',
  Buttons = 'Buttons',
  Footer = 'Footer',
  Header = 'Header'
}

export enum WhatsAppTemplateLanguage {
  Afrikaans = 'Afrikaans',
  Albanian = 'Albanian',
  Arabic = 'Arabic',
  Azerbaijani = 'Azerbaijani',
  Bengali = 'Bengali',
  Bulgarian = 'Bulgarian',
  Catalan = 'Catalan',
  Chinese = 'Chinese',
  Croatian = 'Croatian',
  Czech = 'Czech',
  Danish = 'Danish',
  Dutch = 'Dutch',
  English = 'English',
  Estonian = 'Estonian',
  Filipino = 'Filipino',
  Finnish = 'Finnish',
  French = 'French',
  Georgian = 'Georgian',
  German = 'German',
  Greek = 'Greek',
  Gujarati = 'Gujarati',
  Hausa = 'Hausa',
  Hebrew = 'Hebrew',
  Hindi = 'Hindi',
  Hungarian = 'Hungarian',
  Indonesian = 'Indonesian',
  Irish = 'Irish',
  Italian = 'Italian',
  Japanese = 'Japanese',
  Kannada = 'Kannada',
  Kazakh = 'Kazakh',
  Kinyarwanda = 'Kinyarwanda',
  Korean = 'Korean',
  Kyrgyz = 'Kyrgyz',
  Lao = 'Lao',
  Latvian = 'Latvian',
  Lithuanian = 'Lithuanian',
  Macedonian = 'Macedonian',
  Malay = 'Malay',
  Malayalam = 'Malayalam',
  Marathi = 'Marathi',
  Norwegian = 'Norwegian',
  Persian = 'Persian',
  Polish = 'Polish',
  Portuguese = 'Portuguese',
  Punjabi = 'Punjabi',
  Romanian = 'Romanian',
  Russian = 'Russian',
  Serbian = 'Serbian',
  Slovak = 'Slovak',
  Slovenian = 'Slovenian',
  Spanish = 'Spanish',
  Swahili = 'Swahili',
  Swedish = 'Swedish',
  Tamil = 'Tamil',
  Telugu = 'Telugu',
  Thai = 'Thai',
  Turkish = 'Turkish',
  Ukrainian = 'Ukrainian',
  Unknown = 'Unknown',
  Urdu = 'Urdu',
  Uzbek = 'Uzbek',
  Vietnamese = 'Vietnamese',
  Zulu = 'Zulu'
}

export type WhatsAppTemplateSendInput = {
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
  filledTemplateID: Scalars['FilledWhatsAppTemplateID']['input'];
};

export enum WhatsAppTemplateStatus {
  Approved = 'Approved',
  Archived = 'Archived',
  Deleted = 'Deleted',
  Disabled = 'Disabled',
  InAppeal = 'InAppeal',
  LimitExceeded = 'LimitExceeded',
  Paused = 'Paused',
  Pending = 'Pending',
  PendingDeletion = 'PendingDeletion',
  Rejected = 'Rejected'
}

export type WhatsAppTextMessageSendInput = {
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
  text: Scalars['String']['input'];
};

export enum WhatsappBusinessAccountReviewStatus {
  Approved = 'Approved',
  Pending = 'Pending',
  Rejected = 'Rejected'
}

export type WhatsappContactCreateInput = {
  countryCode?: InputMaybe<Scalars['CountryCode']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  phoneNumber: Scalars['String']['input'];
  source: ContactDashboardSource;
};

export type WidgetAttachmentMessageSendInput = {
  attachment: Scalars['FileID']['input'];
  attachmentType: WebWidgetAttachmentType;
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
};

export type WidgetTextMessageSendInput = {
  clientId?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
};

export type AutomationFileFragment = { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus };

export type FuelyAutomationRefFragment = { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope };

type FuelySettingParts_FuelySettingBookingRules_Fragment = { __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingCatalogImages_Fragment = { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingCollectContactInfo_Fragment = { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingFollowUps_Fragment = { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingIncomingMessages_Fragment = { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingKeywords_Fragment = { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingListOfAds_Fragment = { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingListOfPosts_Fragment = { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingListOfStories_Fragment = { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingMessageDelays_Fragment = { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingPrivateReply_Fragment = { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingPublicReply_Fragment = { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingRefLinks_Fragment = { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingSendEventsToMeta_Fragment = { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingSwitchToHuman_Fragment = { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

type FuelySettingParts_FuelySettingWhenAiReplies_Fragment = { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> };

export type FuelySettingPartsFragment = FuelySettingParts_FuelySettingBookingRules_Fragment | FuelySettingParts_FuelySettingCatalogImages_Fragment | FuelySettingParts_FuelySettingCollectContactInfo_Fragment | FuelySettingParts_FuelySettingFollowUps_Fragment | FuelySettingParts_FuelySettingIncomingMessages_Fragment | FuelySettingParts_FuelySettingKeywords_Fragment | FuelySettingParts_FuelySettingListOfAds_Fragment | FuelySettingParts_FuelySettingListOfPosts_Fragment | FuelySettingParts_FuelySettingListOfStories_Fragment | FuelySettingParts_FuelySettingMessageDelays_Fragment | FuelySettingParts_FuelySettingPrivateReply_Fragment | FuelySettingParts_FuelySettingPublicReply_Fragment | FuelySettingParts_FuelySettingRefLinks_Fragment | FuelySettingParts_FuelySettingSendEventsToMeta_Fragment | FuelySettingParts_FuelySettingSwitchToHuman_Fragment | FuelySettingParts_FuelySettingWhenAiReplies_Fragment;

export type FuelyAutomationPartsFragment = { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> };

export type FuelyAutomationListQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  scope?: InputMaybe<FuelyAutomationScope>;
}>;


export type FuelyAutomationListQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, fuelyAutomations: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> }> } };

export type FuelyAutomationGetQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelyAutomationGetQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, fuelyAutomation: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } } };

export type FuelyAutomationsOverviewQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type FuelyAutomationsOverviewQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, All: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, InstagramDirectMessages: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, InstagramPostComments: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, InstagramAdComments: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, InstagramStoryReplies: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, InstagramIgMeLinks: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, InstagramClickFromAds: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, WhatsAppDirectMessages: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, WhatsAppClickFromAds: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, WhatsAppClickFromPosts: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, FacebookDirectMessages: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, FacebookMMeLinks: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, FacebookPostComments: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, FacebookClickFromAds: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, TikTokDirectMessages: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, TikTokPostComments: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, TikTokClickFromAds: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }>, WebWidgetDirectMessage: Array<{ __typename: 'FuelyAutomation', updatedAt: string, id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } };

export type InstagramMediaPickerQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['InstagramMediasCursor']['input']>;
}>;


export type InstagramMediaPickerQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, instagramMediasConnection: { __typename?: 'InstagramMediasConnection', edges: Array<{ __typename?: 'InstagramMediasEdge', cursor: string, node: { __typename: 'InstagramAd', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | { __typename: 'InstagramPost', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | { __typename: 'InstagramReel', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | { __typename: 'InstagramStory', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }>, pageInfo: { __typename?: 'InstagramMediasPageInfo', hasNextPage: boolean, startCursor?: string | null, endCursor?: string | null } } } };

export type FuelyAutomationUpdatedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type FuelyAutomationUpdatedSubscription = { __typename?: 'Subscription', fuelyAutomationUpdated: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelyAutomationCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  scope: FuelyAutomationScope;
  name: Scalars['String']['input'];
}>;


export type FuelyAutomationCreateMutation = { __typename?: 'Mutation', fuelyAutomationCreate: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelyAutomationDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  scope?: InputMaybe<FuelyAutomationScope>;
}>;


export type FuelyAutomationDeleteMutation = { __typename?: 'Mutation', fuelyAutomationDelete: { __typename?: 'Bot', id: string, fuelyAutomations: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> }> } };

export type FuelyAutomationSetNameMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  name: Scalars['String']['input'];
}>;


export type FuelyAutomationSetNameMutation = { __typename?: 'Mutation', fuelyAutomationSetName: { __typename?: 'FuelyAutomation', id: string, name?: string | null, updatedAt: string } };

export type FuelyAutomationSetEnabledMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  enabled: Scalars['Boolean']['input'];
}>;


export type FuelyAutomationSetEnabledMutation = { __typename?: 'Mutation', fuelyAutomationSetEnabled: { __typename?: 'FuelyAutomation', id: string, enabled: boolean, updatedAt: string } };

export type FuelySettingInheritIncomingMessagesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritIncomingMessagesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritWhenAiRepliesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritWhenAiRepliesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritMessageDelaysMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritMessageDelaysMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritCatalogImagesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritCatalogImagesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritBookingRulesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritBookingRulesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritSwitchToHumanMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritSwitchToHumanMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritFollowUpsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritFollowUpsMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritCollectContactInfoMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritCollectContactInfoMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritPrivateReplyMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritPrivateReplyMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingInheritPublicReplyMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  parentID: Scalars['FuelyAutomationID']['input'];
}>;


export type FuelySettingInheritPublicReplyMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetIncomingMessagesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingIncomingMessagesUpdateInput;
}>;


export type FuelySettingSetIncomingMessagesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetWhenAiRepliesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingWhenAiRepliesUpdateInput;
}>;


export type FuelySettingSetWhenAiRepliesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetMessageDelaysMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingMessageDelaysUpdateInput;
}>;


export type FuelySettingSetMessageDelaysMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetCatalogImagesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingCatalogImagesUpdateInput;
}>;


export type FuelySettingSetCatalogImagesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetBookingRulesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingBookingRulesUpdateInput;
}>;


export type FuelySettingSetBookingRulesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetSwitchToHumanMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingSwitchToHumanUpdateInput;
}>;


export type FuelySettingSetSwitchToHumanMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetFollowUpsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingFollowUpsUpdateInput;
}>;


export type FuelySettingSetFollowUpsMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetCollectContactInfoMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingCollectContactInfoUpdateInput;
}>;


export type FuelySettingSetCollectContactInfoMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetPrivateReplyMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingPrivateReplyUpdateInput;
}>;


export type FuelySettingSetPrivateReplyMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetPublicReplyMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingPublicReplyUpdateInput;
}>;


export type FuelySettingSetPublicReplyMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetKeywordsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingKeywordsUpdateInput;
}>;


export type FuelySettingSetKeywordsMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetListOfPostsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingListOfPostsUpdateInput;
}>;


export type FuelySettingSetListOfPostsMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetListOfStoriesMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingListOfStoriesUpdateInput;
}>;


export type FuelySettingSetListOfStoriesMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetListOfAdsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingListOfAdsUpdateInput;
}>;


export type FuelySettingSetListOfAdsMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type FuelySettingSetRefLinksMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
  update: FuelySettingRefLinksUpdateInput;
}>;


export type FuelySettingSetRefLinksMutation = { __typename?: 'Mutation', fuelyAutomationUpdateSetting: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope, updatedAt: string, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCatalogImages', whenToShow: FuelySettingCatalogImagesWhenToShow, imagesPerCatalogItem: number, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingCollectContactInfo', howToCollect: FuelySettingCollectContactInfoHowToCollect, captures: Array<{ __typename?: 'FuelySettingCollectContactInfoEntry', description: string, validationErrors: Array<FuelyCollectContactInfoEntryValidationErrorCode>, attribute?: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingFollowUps', howToSend: FuelySettingFollowUpsHowToSend, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingIncomingMessages', howToReply: FuelySettingIncomingMessagesHowToReply, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingKeywords', reactTo: FuelySettingKeywordsReactTo, keywords: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfAds', adIDs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfPosts', posts: Array<{ __typename?: 'FuelySettingListOfPostsEntry', postID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingListOfStories', stories: Array<{ __typename?: 'FuelySettingListOfStoriesEntry', storyID: string, contactScopeID: string }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingMessageDelays', enabled: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: FuelySettingPrivateReplyHowToReply, exactTextReply: string, messagePrompt: string, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingPublicReply', publicReplyHowToReply: FuelySettingPublicReplyHowToReply, exactTextReply: string, messagePrompt: string, likeContactComment: boolean, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingRefLinks', refs: Array<string>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSendEventsToMeta', inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingSwitchToHuman', howToSwitch: FuelySettingSwitchToHumanHowToSwitch, rules: Array<{ __typename?: 'FuelySettingSwitchToHumanRule', switchingConditions: string, messagePrompt: string, assignees?: Array<{ __typename?: 'FuelySettingSwitchToHumanRuleAssignee', user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }> | null }>, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> } | { __typename: 'FuelySettingWhenAIReplies', option: FuelySettingWhenAiRepliesOptions, inheritsFrom?: { __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope } | null, canInheritFrom: Array<{ __typename: 'FuelyAutomation', id: string, isBase: boolean, name?: string | null, enabled: boolean, scope: FuelyAutomationScope }> }> } };

export type AutomationsBootstrapQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type AutomationsBootstrapQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, title: string, timezone?: string | null, isMigratedToNewFuelySettings: boolean, contactScopes: Array<{ __typename: 'FacebookContactScope', id: string, facebookPage: { __typename?: 'FbPage', id: string, name: string, picture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } } | { __typename: 'InstagramAccountContactScope', id: string, instagramAccount: { __typename?: 'InstagramAccount', id: string, username: string, name?: string | null, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } } | { __typename: 'TikTokAccountContactScope', id: string, tiktokAccount: { __typename?: 'TikTokAccount', id: string, username?: string | null, name?: string | null } } | { __typename: 'WebWidgetContactScope', id: string, webWidget: { __typename?: 'WebWidget', id: string, name: string, isEnabled: boolean } } | { __typename: 'WhatsAppPhoneContactScope', id: string, phone: { __typename?: 'WhatsAppBusinessPhoneNumber', id: string, displayPhoneNumber: string, verifiedName?: string | null } }>, members: Array<{ __typename?: 'TeamMember', id: string, user: { __typename?: 'PublicUserAccount', id: string, name: string, isUnknown: boolean, profilePicture?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null }, role: { __typename?: 'Role', roleTypeV2: BotRoleTypeV2, botPermissions: Array<{ __typename?: 'Permission', object: PermissionObject, action: PermissionAllowedAction }> } }>, fuelyConfig?: { __typename?: 'FuelyConfig', enabled: boolean, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number }, knowledgeBase: { __typename?: 'FuelyKnowledgeBase', companyName: string, businessHoursSchedule: { __typename?: 'FuelyBusinessHoursSchedule', workingHours?: Array<{ __typename?: 'FuelyBusinessHoursDaySchedule', day: Weekday, enabled: boolean, start: string, end: string }> | null } } } | null } };

export type AutomationsAttributesQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  platforms: Array<Platform> | Platform;
  inputSubstring?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['BotAttributeCursor']['input']>;
}>;


export type AutomationsAttributesQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, botAttributes: { __typename?: 'BotAttributeConnection', edges: Array<{ __typename?: 'BotAttributeEdge', cursor: string, node: { __typename?: 'BotAttributeNode', usersCount?: number | null, botAttribute: { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType } } }>, pageInfo: { __typename?: 'BotAttributePageInfo', hasNextPage: boolean, endCursor?: string | null } } } };

export type AutomationsInstagramMediaQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  id: Scalars['InstagramMediaID']['input'];
}>;


export type AutomationsInstagramMediaQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, contactScopes: Array<{ __typename: 'FacebookContactScope' } | { __typename: 'InstagramAccountContactScope', instagramAccount: { __typename?: 'InstagramAccount', id: string, media?: { __typename: 'InstagramAd', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | { __typename: 'InstagramPost', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | { __typename: 'InstagramReel', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | { __typename: 'InstagramStory', id: string, isUnknown: boolean, caption?: string | null, url: string, thumbnailPreview?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } | null } } | { __typename: 'TikTokAccountContactScope' } | { __typename: 'WebWidgetContactScope' } | { __typename: 'WhatsAppPhoneContactScope' }> } };

export type AutomationsInstagramRefetchMutationVariables = Exact<{
  accountID: Scalars['InstagramAccountID']['input'];
  count: Scalars['Int']['input'];
}>;


export type AutomationsInstagramRefetchMutation = { __typename?: 'Mutation', instagramAccountRefetchLatestMedias: { __typename?: 'InstagramAccount', id: string, username: string } };

export type AutomationsFacebookPostsQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['FbPagePostCursor']['input']>;
}>;


export type AutomationsFacebookPostsQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, contactScopes: Array<{ __typename: 'FacebookContactScope', facebookPage: { __typename?: 'FbPage', id: string, name: string, posts: { __typename?: 'FbPagePostConnection', edges: Array<{ __typename?: 'FbPagePostEdge', cursor: string, node: { __typename?: 'FbPagePost', id: string, message: string, permalinkURL: string, isPublished: boolean, isExpired: boolean, createdTime: string, image?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus } | null } }>, pageInfo: { __typename?: 'FbPagePostInfo', hasNextPage: boolean, endCursor?: string | null } } } } | { __typename: 'InstagramAccountContactScope' } | { __typename: 'TikTokAccountContactScope' } | { __typename: 'WebWidgetContactScope' } | { __typename: 'WhatsAppPhoneContactScope' }> } };

export type AutomationsMetaAdsQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  platforms: Array<Platform> | Platform;
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['MetaAdCursor']['input']>;
}>;


export type AutomationsMetaAdsQuery = { __typename?: 'Query', currentUser: { __typename?: 'CurrentUserAccount', id: string, metaAdsSyncState?: { __typename?: 'MetaAdsSyncState', id: string, requestedAt: string, finishedAt?: string | null } | null, metaAdAccounts: Array<{ __typename?: 'MetaAdAccount', id: string, metaAdAccountID: string, name: string, hasWhatsappAds: boolean, hasInstagramAds: boolean, ads: { __typename?: 'MetaAds', edges: Array<{ __typename?: 'MetaAdEdge', cursor: string, node: { __typename?: 'MetaAd', id: string, name: string, metaAdId: string, effectiveStatus: MetaAdEffectiveStatus, thumbnailURL?: string | null, adSetDestinationType?: AdSetDestinationType | null } }>, pageInfo: { __typename?: 'MetaAdsPageInfo', hasNextPage: boolean, endCursor?: string | null } } }> } };

type AutomationsPvMessage_FacebookInAudioMessage_Fragment = { __typename: 'FacebookInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookInFileMessage_Fragment = { __typename: 'FacebookInFileMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookInImageMessage_Fragment = { __typename: 'FacebookInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookInPostCommentMessage_Fragment = { __typename: 'FacebookInPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookInTextMessage_Fragment = { __typename: 'FacebookInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookInUnknownMessage_Fragment = { __typename: 'FacebookInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookInVideoMessage_Fragment = { __typename: 'FacebookInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookOutAudioMessage_Fragment = { __typename: 'FacebookOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookOutImageMessage_Fragment = { __typename: 'FacebookOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookOutPublicCommentReplyMessage_Fragment = { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookOutTextMessage_Fragment = { __typename: 'FacebookOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookOutUnknownMessage_Fragment = { __typename: 'FacebookOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_FacebookOutVideoMessage_Fragment = { __typename: 'FacebookOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInAdCommentMessage_Fragment = { __typename: 'InstagramInAdCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInAudioMessage_Fragment = { __typename: 'InstagramInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInFeedCommentMessage_Fragment = { __typename: 'InstagramInFeedCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInImageMessage_Fragment = { __typename: 'InstagramInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInReelCommentMessage_Fragment = { __typename: 'InstagramInReelCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInStoryReplyMessage_Fragment = { __typename: 'InstagramInStoryReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInTextMessage_Fragment = { __typename: 'InstagramInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInUnknownMessage_Fragment = { __typename: 'InstagramInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramInVideoMessage_Fragment = { __typename: 'InstagramInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramOutAudioMessage_Fragment = { __typename: 'InstagramOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramOutImageMessage_Fragment = { __typename: 'InstagramOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramOutPublicCommentReplyMessage_Fragment = { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramOutTextMessage_Fragment = { __typename: 'InstagramOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramOutUnknownMessage_Fragment = { __typename: 'InstagramOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_InstagramOutVideoMessage_Fragment = { __typename: 'InstagramOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemConversationSummaryMessage_Fragment = { __typename: 'SystemConversationSummaryMessage', summary: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedByBooking_Fragment = { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedByCoexMessage_Fragment = { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedByComponentMessage_Fragment = { __typename: 'SystemLivechatOpenedByComponentMessage', originallyDecidedByAI: boolean, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemLivechatOpenedManuallyMessage_Fragment = { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemMetaConversionEventSentMessage_Fragment = { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_SystemTypingMessage_Fragment = { __typename: 'SystemTypingMessage', until: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokInImageMessage_Fragment = { __typename: 'TikTokInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokInTextMessage_Fragment = { __typename: 'TikTokInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokInTextPostCommentMessage_Fragment = { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokInUnknownMessage_Fragment = { __typename: 'TikTokInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokOutImageMessage_Fragment = { __typename: 'TikTokOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokOutPublicCommentReplyMessage_Fragment = { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokOutTextMessage_Fragment = { __typename: 'TikTokOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_TikTokOutUnknownMessage_Fragment = { __typename: 'TikTokOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WebWidgetAttachmentMessage_Fragment = { __typename: 'WebWidgetAttachmentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WebWidgetTextAndButtonsMessage_Fragment = { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WebWidgetTextMessage_Fragment = { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInAudioMessage_Fragment = { __typename: 'WhatsAppInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInDocumentMessage_Fragment = { __typename: 'WhatsAppInDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInImageMessage_Fragment = { __typename: 'WhatsAppInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInListRowClickMessage_Fragment = { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInTextMessage_Fragment = { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInUnknownMessage_Fragment = { __typename: 'WhatsAppInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppInVideoMessage_Fragment = { __typename: 'WhatsAppInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutAudioMessage_Fragment = { __typename: 'WhatsAppOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutDocumentMessage_Fragment = { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutImageMessage_Fragment = { __typename: 'WhatsAppOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutListMessage_Fragment = { __typename: 'WhatsAppOutListMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutTemplateMessage_Fragment = { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutTextAndUrlMessage_Fragment = { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutTextMessage_Fragment = { __typename: 'WhatsAppOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutUnknownMessage_Fragment = { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type AutomationsPvMessage_WhatsAppOutVideoMessage_Fragment = { __typename: 'WhatsAppOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

export type AutomationsPvMessageFragment = AutomationsPvMessage_FacebookInAudioMessage_Fragment | AutomationsPvMessage_FacebookInFileMessage_Fragment | AutomationsPvMessage_FacebookInImageMessage_Fragment | AutomationsPvMessage_FacebookInPostCommentMessage_Fragment | AutomationsPvMessage_FacebookInTextMessage_Fragment | AutomationsPvMessage_FacebookInUnknownMessage_Fragment | AutomationsPvMessage_FacebookInVideoMessage_Fragment | AutomationsPvMessage_FacebookOutAudioMessage_Fragment | AutomationsPvMessage_FacebookOutImageMessage_Fragment | AutomationsPvMessage_FacebookOutPublicCommentReplyMessage_Fragment | AutomationsPvMessage_FacebookOutTextMessage_Fragment | AutomationsPvMessage_FacebookOutUnknownMessage_Fragment | AutomationsPvMessage_FacebookOutVideoMessage_Fragment | AutomationsPvMessage_InstagramInAdCommentMessage_Fragment | AutomationsPvMessage_InstagramInAudioMessage_Fragment | AutomationsPvMessage_InstagramInFeedCommentMessage_Fragment | AutomationsPvMessage_InstagramInImageMessage_Fragment | AutomationsPvMessage_InstagramInReelCommentMessage_Fragment | AutomationsPvMessage_InstagramInStoryReplyMessage_Fragment | AutomationsPvMessage_InstagramInTextMessage_Fragment | AutomationsPvMessage_InstagramInUnknownMessage_Fragment | AutomationsPvMessage_InstagramInVideoMessage_Fragment | AutomationsPvMessage_InstagramOutAudioMessage_Fragment | AutomationsPvMessage_InstagramOutImageMessage_Fragment | AutomationsPvMessage_InstagramOutPublicCommentReplyMessage_Fragment | AutomationsPvMessage_InstagramOutTextMessage_Fragment | AutomationsPvMessage_InstagramOutUnknownMessage_Fragment | AutomationsPvMessage_InstagramOutVideoMessage_Fragment | AutomationsPvMessage_SystemConversationSummaryMessage_Fragment | AutomationsPvMessage_SystemLivechatClosedByAutoClosingMessage_Fragment | AutomationsPvMessage_SystemLivechatOpenedByBooking_Fragment | AutomationsPvMessage_SystemLivechatOpenedByCoexMessage_Fragment | AutomationsPvMessage_SystemLivechatOpenedByComponentMessage_Fragment | AutomationsPvMessage_SystemLivechatOpenedByFacebookAppMessage_Fragment | AutomationsPvMessage_SystemLivechatOpenedByInstagramAppMessage_Fragment | AutomationsPvMessage_SystemLivechatOpenedByTikTokAppMessage_Fragment | AutomationsPvMessage_SystemLivechatOpenedManuallyMessage_Fragment | AutomationsPvMessage_SystemMetaConversionEventSentMessage_Fragment | AutomationsPvMessage_SystemTypingMessage_Fragment | AutomationsPvMessage_TikTokInImageMessage_Fragment | AutomationsPvMessage_TikTokInTextMessage_Fragment | AutomationsPvMessage_TikTokInTextPostCommentMessage_Fragment | AutomationsPvMessage_TikTokInUnknownMessage_Fragment | AutomationsPvMessage_TikTokOutImageMessage_Fragment | AutomationsPvMessage_TikTokOutPublicCommentReplyMessage_Fragment | AutomationsPvMessage_TikTokOutTextMessage_Fragment | AutomationsPvMessage_TikTokOutUnknownMessage_Fragment | AutomationsPvMessage_WebWidgetAttachmentMessage_Fragment | AutomationsPvMessage_WebWidgetCallPhoneButtonClickMessage_Fragment | AutomationsPvMessage_WebWidgetContinueFlowButtonClickMessage_Fragment | AutomationsPvMessage_WebWidgetOpenUrlButtonClickMessage_Fragment | AutomationsPvMessage_WebWidgetTextAndButtonsMessage_Fragment | AutomationsPvMessage_WebWidgetTextMessage_Fragment | AutomationsPvMessage_WhatsAppInAudioMessage_Fragment | AutomationsPvMessage_WhatsAppInContinueFlowButtonClickMessage_Fragment | AutomationsPvMessage_WhatsAppInDocumentMessage_Fragment | AutomationsPvMessage_WhatsAppInImageMessage_Fragment | AutomationsPvMessage_WhatsAppInListRowClickMessage_Fragment | AutomationsPvMessage_WhatsAppInMediaPlaceholderMessage_Fragment | AutomationsPvMessage_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | AutomationsPvMessage_WhatsAppInTextMessage_Fragment | AutomationsPvMessage_WhatsAppInUnknownMessage_Fragment | AutomationsPvMessage_WhatsAppInVideoMessage_Fragment | AutomationsPvMessage_WhatsAppOutAudioMessage_Fragment | AutomationsPvMessage_WhatsAppOutDocumentMessage_Fragment | AutomationsPvMessage_WhatsAppOutImageMessage_Fragment | AutomationsPvMessage_WhatsAppOutListMessage_Fragment | AutomationsPvMessage_WhatsAppOutMediaPlaceholderMessage_Fragment | AutomationsPvMessage_WhatsAppOutTemplateMessage_Fragment | AutomationsPvMessage_WhatsAppOutTextAndButtonsMessage_Fragment | AutomationsPvMessage_WhatsAppOutTextAndUrlMessage_Fragment | AutomationsPvMessage_WhatsAppOutTextMessage_Fragment | AutomationsPvMessage_WhatsAppOutUnknownMessage_Fragment | AutomationsPvMessage_WhatsAppOutVideoMessage_Fragment;

export type AutomationsPreviewStartForAutomationMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  automationID: Scalars['FuelyAutomationID']['input'];
}>;


export type AutomationsPreviewStartForAutomationMutation = { __typename?: 'Mutation', previewResponsesStartForFuelyAutomation: { __typename: 'PreviewResponsesFuelyAutomationSession', id: string, conversationID: string, startedAt: string, platform: Platform, fuelyAutomationID: string } };

export type AutomationsPreviewMessagesQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['MessagesCursor']['input']>;
}>;


export type AutomationsPreviewMessagesQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, conversation: { __typename?: 'Conversation', id: string, platform: Platform, messages: { __typename?: 'MessagePage', edges: Array<{ __typename?: 'MessageEdge', cursor: string, node: { __typename: 'FacebookInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInFileMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInAdCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInFeedCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInReelCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInStoryReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemConversationSummaryMessage', summary: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByComponentMessage', originallyDecidedByAI: boolean, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemTypingMessage', until: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetAttachmentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutListMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } }>, pageInfo: { __typename?: 'MessagePageInfo', hasNextPage: boolean, endCursor?: string | null } } } } };

export type AutomationsPreviewMessageAddedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
}>;


export type AutomationsPreviewMessageAddedSubscription = { __typename?: 'Subscription', messageAdded?: { __typename: 'FacebookInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInFileMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInAdCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInFeedCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInReelCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInStoryReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemConversationSummaryMessage', summary: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByComponentMessage', originallyDecidedByAI: boolean, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemTypingMessage', until: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetAttachmentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutListMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export type AutomationsPreviewMessageUpdatedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
}>;


export type AutomationsPreviewMessageUpdatedSubscription = { __typename?: 'Subscription', messageUpdated?: { __typename: 'FacebookInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInFileMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'FacebookOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInAdCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInFeedCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInReelCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInStoryReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'InstagramOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemConversationSummaryMessage', summary: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByComponentMessage', originallyDecidedByAI: boolean, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'SystemTypingMessage', until: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'TikTokOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetAttachmentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutListMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | { __typename: 'WhatsAppOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export type AutomationsPreviewWhatsAppTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: WhatsAppTextMessageSendInput;
}>;


export type AutomationsPreviewWhatsAppTextSendMutation = { __typename?: 'Mutation', previewResponsesWhatsappTextSend?: { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export type AutomationsPreviewWidgetTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: WidgetTextMessageSendInput;
}>;


export type AutomationsPreviewWidgetTextSendMutation = { __typename?: 'Mutation', previewResponsesWidgetTextSend?: { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export type AutomationsPreviewInstagramTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: InstagramTextMessageSendInput;
}>;


export type AutomationsPreviewInstagramTextSendMutation = { __typename?: 'Mutation', previewResponsesInstagramTextSend?: { __typename: 'InstagramInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export type AutomationsPreviewTikTokTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: TikTokTextMessageSendInput;
}>;


export type AutomationsPreviewTikTokTextSendMutation = { __typename?: 'Mutation', previewResponsesTikTokTextSend?: { __typename: 'TikTokInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export type AutomationsPreviewFacebookTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: FacebookTextMessageSendInput;
}>;


export type AutomationsPreviewFacebookTextSendMutation = { __typename?: 'Mutation', previewResponsesFacebookTextSend?: { __typename: 'FacebookInTextMessage', text: string, id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const FuelyAutomationRefFragmentDoc = new TypedDocumentString(`
fragment FuelyAutomationRef on FuelyAutomation {
  __typename
  id
  isBase
  name
  enabled
  scope
}`, {"fragmentName":"FuelyAutomationRef"}) as unknown as TypedDocumentString<FuelyAutomationRefFragment, unknown>;
export const AutomationFileFragmentDoc = new TypedDocumentString(`
fragment AutomationFile on File {
  id
  url
  type
  status
}`, {"fragmentName":"AutomationFile"}) as unknown as TypedDocumentString<AutomationFileFragment, unknown>;
export const FuelySettingPartsFragmentDoc = new TypedDocumentString(`
fragment FuelySettingParts on FuelySetting {
  __typename
  inheritsFrom {
    ...FuelyAutomationRef
  }
  canInheritFrom {
    ...FuelyAutomationRef
  }
  ... on FuelySettingMessageDelays {
    enabled
  }
  ... on FuelySettingWhenAIReplies {
    option
  }
  ... on FuelySettingCatalogImages {
    whenToShow
    imagesPerCatalogItem
  }
  ... on FuelySettingIncomingMessages {
    howToReply
    messagePrompt
  }
  ... on FuelySettingBookingRules {
    autonomyLevel
  }
  ... on FuelySettingSwitchToHuman {
    howToSwitch
    rules {
      switchingConditions
      messagePrompt
      assignees {
        user {
          id
          name
          isUnknown
          profilePicture {
            ...AutomationFile
          }
        }
      }
    }
  }
  ... on FuelySettingFollowUps {
    howToSend
    messagePrompt
  }
  ... on FuelySettingCollectContactInfo {
    howToCollect
    captures {
      description
      attribute {
        name
        type
        dataType
      }
      validationErrors
    }
  }
  ... on FuelySettingPrivateReply {
    privateReplyHowToReply
    exactTextReply
    messagePrompt
  }
  ... on FuelySettingPublicReply {
    publicReplyHowToReply
    exactTextReply
    messagePrompt
    likeContactComment
  }
  ... on FuelySettingKeywords {
    reactTo
    keywords
  }
  ... on FuelySettingListOfPosts {
    posts {
      postID
      contactScopeID
    }
  }
  ... on FuelySettingListOfStories {
    stories {
      storyID
      contactScopeID
    }
  }
  ... on FuelySettingListOfAds {
    adIDs
  }
  ... on FuelySettingRefLinks {
    refs
  }
}`, {"fragmentName":"FuelySettingParts"}) as unknown as TypedDocumentString<FuelySettingPartsFragment, unknown>;
export const FuelyAutomationPartsFragmentDoc = new TypedDocumentString(`
fragment FuelyAutomationParts on FuelyAutomation {
  __typename
  id
  isBase
  name
  enabled
  scope
  updatedAt
  settings {
    ...FuelySettingParts
  }
}`, {"fragmentName":"FuelyAutomationParts"}) as unknown as TypedDocumentString<FuelyAutomationPartsFragment, unknown>;
export const AutomationsPvMessageFragmentDoc = new TypedDocumentString(`
fragment AutomationsPvMessage on Message {
  __typename
  id
  clientId
  sentTime
  updatedAt
  sender {
    __typename
    id
    name
  }
  errors {
    code
    date
  }
  ... on WhatsAppInTextMessage {
    text
  }
  ... on WhatsAppOutTextMessage {
    text
  }
  ... on WebWidgetTextMessage {
    text
  }
  ... on InstagramInTextMessage {
    text
  }
  ... on InstagramOutTextMessage {
    text
  }
  ... on TikTokInTextMessage {
    text
  }
  ... on TikTokOutTextMessage {
    text
  }
  ... on FacebookInTextMessage {
    text
  }
  ... on FacebookOutTextMessage {
    text
  }
  ... on SystemTypingMessage {
    until
  }
  ... on SystemConversationSummaryMessage {
    summary
  }
  ... on SystemLivechatOpenedByComponentMessage {
    originallyDecidedByAI
  }
}`, {"fragmentName":"AutomationsPvMessage"}) as unknown as TypedDocumentString<AutomationsPvMessageFragment, unknown>;
export const FuelyAutomationListDocument = new TypedDocumentString(`
query FuelyAutomationList($botID: BotID!, $scope: FuelyAutomationScope) {
  bot(id: $botID) {
    id
    fuelyAutomations(scope: $scope) {
      ...FuelyAutomationParts
    }
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelyAutomationListQuery, FuelyAutomationListQueryVariables>;
export const FuelyAutomationGetDocument = new TypedDocumentString(`
query FuelyAutomationGet($botID: BotID!, $automationID: FuelyAutomationID!) {
  bot(id: $botID) {
    id
    fuelyAutomation(id: $automationID) {
      ...FuelyAutomationParts
    }
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelyAutomationGetQuery, FuelyAutomationGetQueryVariables>;
export const FuelyAutomationsOverviewDocument = new TypedDocumentString(`
query FuelyAutomationsOverview($botID: BotID!) {
  bot(id: $botID) {
    id
    All: fuelyAutomations(scope: All) {
      ...FuelyAutomationRef
      updatedAt
    }
    InstagramDirectMessages: fuelyAutomations(scope: InstagramDirectMessages) {
      ...FuelyAutomationRef
      updatedAt
    }
    InstagramPostComments: fuelyAutomations(scope: InstagramPostComments) {
      ...FuelyAutomationRef
      updatedAt
    }
    InstagramAdComments: fuelyAutomations(scope: InstagramAdComments) {
      ...FuelyAutomationRef
      updatedAt
    }
    InstagramStoryReplies: fuelyAutomations(scope: InstagramStoryReplies) {
      ...FuelyAutomationRef
      updatedAt
    }
    InstagramIgMeLinks: fuelyAutomations(scope: InstagramIgMeLinks) {
      ...FuelyAutomationRef
      updatedAt
    }
    InstagramClickFromAds: fuelyAutomations(scope: InstagramClickFromAds) {
      ...FuelyAutomationRef
      updatedAt
    }
    WhatsAppDirectMessages: fuelyAutomations(scope: WhatsAppDirectMessages) {
      ...FuelyAutomationRef
      updatedAt
    }
    WhatsAppClickFromAds: fuelyAutomations(scope: WhatsAppClickFromAds) {
      ...FuelyAutomationRef
      updatedAt
    }
    WhatsAppClickFromPosts: fuelyAutomations(scope: WhatsAppClickFromPosts) {
      ...FuelyAutomationRef
      updatedAt
    }
    FacebookDirectMessages: fuelyAutomations(scope: FacebookDirectMessages) {
      ...FuelyAutomationRef
      updatedAt
    }
    FacebookMMeLinks: fuelyAutomations(scope: FacebookMMeLinks) {
      ...FuelyAutomationRef
      updatedAt
    }
    FacebookPostComments: fuelyAutomations(scope: FacebookPostComments) {
      ...FuelyAutomationRef
      updatedAt
    }
    FacebookClickFromAds: fuelyAutomations(scope: FacebookClickFromAds) {
      ...FuelyAutomationRef
      updatedAt
    }
    TikTokDirectMessages: fuelyAutomations(scope: TikTokDirectMessages) {
      ...FuelyAutomationRef
      updatedAt
    }
    TikTokPostComments: fuelyAutomations(scope: TikTokPostComments) {
      ...FuelyAutomationRef
      updatedAt
    }
    TikTokClickFromAds: fuelyAutomations(scope: TikTokClickFromAds) {
      ...FuelyAutomationRef
      updatedAt
    }
    WebWidgetDirectMessage: fuelyAutomations(scope: WebWidgetDirectMessage) {
      ...FuelyAutomationRef
      updatedAt
    }
  }
}
${FuelyAutomationRefFragmentDoc}`) as unknown as TypedDocumentString<FuelyAutomationsOverviewQuery, FuelyAutomationsOverviewQueryVariables>;
export const InstagramMediaPickerDocument = new TypedDocumentString(`
query InstagramMediaPicker($botID: BotID!, $first: Int!, $after: InstagramMediasCursor) {
  bot(id: $botID) {
    id
    instagramMediasConnection(first: $first, after: $after) {
      edges {
        cursor
        node {
          __typename
          ... on InstagramPost {
            id
            isUnknown
            caption
            url
            thumbnailPreview {
              ...AutomationFile
            }
          }
          ... on InstagramReel {
            id
            isUnknown
            caption
            url
            thumbnailPreview {
              ...AutomationFile
            }
          }
          ... on InstagramAd {
            id
            isUnknown
            caption
            url
            thumbnailPreview {
              ...AutomationFile
            }
          }
          ... on InstagramStory {
            id
            isUnknown
            caption
            url
            thumbnailPreview {
              ...AutomationFile
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
}
${AutomationFileFragmentDoc}`) as unknown as TypedDocumentString<InstagramMediaPickerQuery, InstagramMediaPickerQueryVariables>;
export const FuelyAutomationUpdatedDocument = new TypedDocumentString(`
subscription FuelyAutomationUpdated($botID: BotID!) {
  fuelyAutomationUpdated(botID: $botID) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelyAutomationUpdatedSubscription, FuelyAutomationUpdatedSubscriptionVariables>;
export const FuelyAutomationCreateDocument = new TypedDocumentString(`
mutation FuelyAutomationCreate($botID: BotID!, $scope: FuelyAutomationScope!, $name: String!) {
  fuelyAutomationCreate(botID: $botID, scope: $scope, name: $name) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelyAutomationCreateMutation, FuelyAutomationCreateMutationVariables>;
export const FuelyAutomationDeleteDocument = new TypedDocumentString(`
mutation FuelyAutomationDelete($botID: BotID!, $automationID: FuelyAutomationID!, $scope: FuelyAutomationScope) {
  fuelyAutomationDelete(botID: $botID, id: $automationID) {
    id
    fuelyAutomations(scope: $scope) {
      ...FuelyAutomationParts
    }
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelyAutomationDeleteMutation, FuelyAutomationDeleteMutationVariables>;
export const FuelyAutomationSetNameDocument = new TypedDocumentString(`
mutation FuelyAutomationSetName($botID: BotID!, $automationID: FuelyAutomationID!, $name: String!) {
  fuelyAutomationSetName(botID: $botID, id: $automationID, name: $name) {
    id
    name
    updatedAt
  }
}`) as unknown as TypedDocumentString<FuelyAutomationSetNameMutation, FuelyAutomationSetNameMutationVariables>;
export const FuelyAutomationSetEnabledDocument = new TypedDocumentString(`
mutation FuelyAutomationSetEnabled($botID: BotID!, $automationID: FuelyAutomationID!, $enabled: Boolean!) {
  fuelyAutomationSetEnabled(botID: $botID, id: $automationID, enabled: $enabled) {
    id
    enabled
    updatedAt
  }
}`) as unknown as TypedDocumentString<FuelyAutomationSetEnabledMutation, FuelyAutomationSetEnabledMutationVariables>;
export const FuelySettingInheritIncomingMessagesDocument = new TypedDocumentString(`
mutation FuelySettingInheritIncomingMessages($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {incomingMessages: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritIncomingMessagesMutation, FuelySettingInheritIncomingMessagesMutationVariables>;
export const FuelySettingInheritWhenAiRepliesDocument = new TypedDocumentString(`
mutation FuelySettingInheritWhenAIReplies($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {whenAIReplies: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritWhenAiRepliesMutation, FuelySettingInheritWhenAiRepliesMutationVariables>;
export const FuelySettingInheritMessageDelaysDocument = new TypedDocumentString(`
mutation FuelySettingInheritMessageDelays($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {messageDelays: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritMessageDelaysMutation, FuelySettingInheritMessageDelaysMutationVariables>;
export const FuelySettingInheritCatalogImagesDocument = new TypedDocumentString(`
mutation FuelySettingInheritCatalogImages($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {catalogImages: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritCatalogImagesMutation, FuelySettingInheritCatalogImagesMutationVariables>;
export const FuelySettingInheritBookingRulesDocument = new TypedDocumentString(`
mutation FuelySettingInheritBookingRules($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {bookingRules: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritBookingRulesMutation, FuelySettingInheritBookingRulesMutationVariables>;
export const FuelySettingInheritSwitchToHumanDocument = new TypedDocumentString(`
mutation FuelySettingInheritSwitchToHuman($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {switchToHuman: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritSwitchToHumanMutation, FuelySettingInheritSwitchToHumanMutationVariables>;
export const FuelySettingInheritFollowUpsDocument = new TypedDocumentString(`
mutation FuelySettingInheritFollowUps($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {followUps: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritFollowUpsMutation, FuelySettingInheritFollowUpsMutationVariables>;
export const FuelySettingInheritCollectContactInfoDocument = new TypedDocumentString(`
mutation FuelySettingInheritCollectContactInfo($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {collectContactInfo: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritCollectContactInfoMutation, FuelySettingInheritCollectContactInfoMutationVariables>;
export const FuelySettingInheritPrivateReplyDocument = new TypedDocumentString(`
mutation FuelySettingInheritPrivateReply($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {privateReply: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritPrivateReplyMutation, FuelySettingInheritPrivateReplyMutationVariables>;
export const FuelySettingInheritPublicReplyDocument = new TypedDocumentString(`
mutation FuelySettingInheritPublicReply($botID: BotID!, $automationID: FuelyAutomationID!, $parentID: FuelyAutomationID!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {publicReply: {setInheritFrom: $parentID}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingInheritPublicReplyMutation, FuelySettingInheritPublicReplyMutationVariables>;
export const FuelySettingSetIncomingMessagesDocument = new TypedDocumentString(`
mutation FuelySettingSetIncomingMessages($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingIncomingMessagesUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {incomingMessages: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetIncomingMessagesMutation, FuelySettingSetIncomingMessagesMutationVariables>;
export const FuelySettingSetWhenAiRepliesDocument = new TypedDocumentString(`
mutation FuelySettingSetWhenAIReplies($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingWhenAIRepliesUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {whenAIReplies: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetWhenAiRepliesMutation, FuelySettingSetWhenAiRepliesMutationVariables>;
export const FuelySettingSetMessageDelaysDocument = new TypedDocumentString(`
mutation FuelySettingSetMessageDelays($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingMessageDelaysUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {messageDelays: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetMessageDelaysMutation, FuelySettingSetMessageDelaysMutationVariables>;
export const FuelySettingSetCatalogImagesDocument = new TypedDocumentString(`
mutation FuelySettingSetCatalogImages($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingCatalogImagesUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {catalogImages: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetCatalogImagesMutation, FuelySettingSetCatalogImagesMutationVariables>;
export const FuelySettingSetBookingRulesDocument = new TypedDocumentString(`
mutation FuelySettingSetBookingRules($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingBookingRulesUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {bookingRules: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetBookingRulesMutation, FuelySettingSetBookingRulesMutationVariables>;
export const FuelySettingSetSwitchToHumanDocument = new TypedDocumentString(`
mutation FuelySettingSetSwitchToHuman($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingSwitchToHumanUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {switchToHuman: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetSwitchToHumanMutation, FuelySettingSetSwitchToHumanMutationVariables>;
export const FuelySettingSetFollowUpsDocument = new TypedDocumentString(`
mutation FuelySettingSetFollowUps($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingFollowUpsUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {followUps: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetFollowUpsMutation, FuelySettingSetFollowUpsMutationVariables>;
export const FuelySettingSetCollectContactInfoDocument = new TypedDocumentString(`
mutation FuelySettingSetCollectContactInfo($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingCollectContactInfoUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {collectContactInfo: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetCollectContactInfoMutation, FuelySettingSetCollectContactInfoMutationVariables>;
export const FuelySettingSetPrivateReplyDocument = new TypedDocumentString(`
mutation FuelySettingSetPrivateReply($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingPrivateReplyUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {privateReply: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetPrivateReplyMutation, FuelySettingSetPrivateReplyMutationVariables>;
export const FuelySettingSetPublicReplyDocument = new TypedDocumentString(`
mutation FuelySettingSetPublicReply($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingPublicReplyUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {publicReply: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetPublicReplyMutation, FuelySettingSetPublicReplyMutationVariables>;
export const FuelySettingSetKeywordsDocument = new TypedDocumentString(`
mutation FuelySettingSetKeywords($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingKeywordsUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {keywords: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetKeywordsMutation, FuelySettingSetKeywordsMutationVariables>;
export const FuelySettingSetListOfPostsDocument = new TypedDocumentString(`
mutation FuelySettingSetListOfPosts($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingListOfPostsUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {listOfPosts: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetListOfPostsMutation, FuelySettingSetListOfPostsMutationVariables>;
export const FuelySettingSetListOfStoriesDocument = new TypedDocumentString(`
mutation FuelySettingSetListOfStories($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingListOfStoriesUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {listOfStories: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetListOfStoriesMutation, FuelySettingSetListOfStoriesMutationVariables>;
export const FuelySettingSetListOfAdsDocument = new TypedDocumentString(`
mutation FuelySettingSetListOfAds($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingListOfAdsUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {listOfAds: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetListOfAdsMutation, FuelySettingSetListOfAdsMutationVariables>;
export const FuelySettingSetRefLinksDocument = new TypedDocumentString(`
mutation FuelySettingSetRefLinks($botID: BotID!, $automationID: FuelyAutomationID!, $update: FuelySettingRefLinksUpdateInput!) {
  fuelyAutomationUpdateSetting(
    botID: $botID
    id: $automationID
    update: {refLinks: {update: $update}}
  ) {
    ...FuelyAutomationParts
  }
}
${AutomationFileFragmentDoc}
${FuelyAutomationRefFragmentDoc}
${FuelySettingPartsFragmentDoc}
${FuelyAutomationPartsFragmentDoc}`) as unknown as TypedDocumentString<FuelySettingSetRefLinksMutation, FuelySettingSetRefLinksMutationVariables>;
export const AutomationsBootstrapDocument = new TypedDocumentString(`
query AutomationsBootstrap($botID: BotID!) {
  bot(id: $botID) {
    id
    title
    timezone
    isMigratedToNewFuelySettings
    contactScopes {
      __typename
      id
      ... on WhatsAppPhoneContactScope {
        phone {
          id
          displayPhoneNumber
          verifiedName
        }
      }
      ... on InstagramAccountContactScope {
        instagramAccount {
          id
          username
          name
          profilePicture {
            ...AutomationFile
          }
        }
      }
      ... on TikTokAccountContactScope {
        tiktokAccount {
          id
          username
          name
        }
      }
      ... on FacebookContactScope {
        facebookPage {
          id
          name
          picture {
            ...AutomationFile
          }
        }
      }
      ... on WebWidgetContactScope {
        webWidget {
          id
          name
          isEnabled
        }
      }
    }
    members {
      id
      user {
        id
        name
        isUnknown
        profilePicture {
          ...AutomationFile
        }
      }
      role {
        roleTypeV2
        botPermissions {
          object
          action
        }
      }
    }
    fuelyConfig {
      enabled
      usage {
        total
        catalog
      }
      knowledgeBase {
        companyName
        businessHoursSchedule {
          workingHours {
            day
            enabled
            start
            end
          }
        }
      }
    }
  }
}
${AutomationFileFragmentDoc}`) as unknown as TypedDocumentString<AutomationsBootstrapQuery, AutomationsBootstrapQueryVariables>;
export const AutomationsAttributesDocument = new TypedDocumentString(`
query AutomationsAttributes($botID: BotID!, $platforms: [Platform!]!, $inputSubstring: String, $first: Int, $after: BotAttributeCursor) {
  bot(id: $botID) {
    id
    botAttributes(
      locale: En
      platforms: $platforms
      attributeTypes: [custom]
      filters: []
      orderBy: {orderBy: AttributeName, direction: Asc}
      inputSubstring: $inputSubstring
      first: $first
      after: $after
    ) {
      edges {
        node {
          botAttribute {
            name
            type
            dataType
          }
          usersCount
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`) as unknown as TypedDocumentString<AutomationsAttributesQuery, AutomationsAttributesQueryVariables>;
export const AutomationsInstagramMediaDocument = new TypedDocumentString(`
query AutomationsInstagramMedia($botID: BotID!, $id: InstagramMediaID!) {
  bot(id: $botID) {
    id
    contactScopes {
      __typename
      ... on InstagramAccountContactScope {
        instagramAccount {
          id
          media(id: $id) {
            __typename
            ... on InstagramPost {
              id
              isUnknown
              caption
              url
              thumbnailPreview {
                ...AutomationFile
              }
            }
            ... on InstagramReel {
              id
              isUnknown
              caption
              url
              thumbnailPreview {
                ...AutomationFile
              }
            }
            ... on InstagramAd {
              id
              isUnknown
              caption
              url
              thumbnailPreview {
                ...AutomationFile
              }
            }
            ... on InstagramStory {
              id
              isUnknown
              caption
              url
              thumbnailPreview {
                ...AutomationFile
              }
            }
          }
        }
      }
    }
  }
}
${AutomationFileFragmentDoc}`) as unknown as TypedDocumentString<AutomationsInstagramMediaQuery, AutomationsInstagramMediaQueryVariables>;
export const AutomationsInstagramRefetchDocument = new TypedDocumentString(`
mutation AutomationsInstagramRefetch($accountID: InstagramAccountID!, $count: Int!) {
  instagramAccountRefetchLatestMedias(id: $accountID, count: $count) {
    id
    username
  }
}`) as unknown as TypedDocumentString<AutomationsInstagramRefetchMutation, AutomationsInstagramRefetchMutationVariables>;
export const AutomationsFacebookPostsDocument = new TypedDocumentString(`
query AutomationsFacebookPosts($botID: BotID!, $first: Int!, $after: FbPagePostCursor) {
  bot(id: $botID) {
    id
    contactScopes {
      __typename
      ... on FacebookContactScope {
        facebookPage {
          id
          name
          posts(first: $first, after: $after) {
            edges {
              cursor
              node {
                id
                message
                permalinkURL
                image {
                  ...AutomationFile
                }
                isPublished
                isExpired
                createdTime
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  }
}
${AutomationFileFragmentDoc}`) as unknown as TypedDocumentString<AutomationsFacebookPostsQuery, AutomationsFacebookPostsQueryVariables>;
export const AutomationsMetaAdsDocument = new TypedDocumentString(`
query AutomationsMetaAds($botID: BotID!, $platforms: [Platform!]!, $first: Int!, $after: MetaAdCursor) {
  currentUser {
    id
    metaAdsSyncState {
      id
      requestedAt
      finishedAt
    }
    metaAdAccounts {
      id
      metaAdAccountID
      name
      hasWhatsappAds
      hasInstagramAds
      ads(botID: $botID, platforms: $platforms, first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            name
            metaAdId
            effectiveStatus
            thumbnailURL
            adSetDestinationType
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<AutomationsMetaAdsQuery, AutomationsMetaAdsQueryVariables>;
export const AutomationsPreviewStartForAutomationDocument = new TypedDocumentString(`
mutation AutomationsPreviewStartForAutomation($botID: BotID!, $automationID: FuelyAutomationID!) {
  previewResponsesStartForFuelyAutomation(
    botID: $botID
    fuelyAutomationID: $automationID
  ) {
    __typename
    id
    conversationID
    startedAt
    platform
    fuelyAutomationID
  }
}`) as unknown as TypedDocumentString<AutomationsPreviewStartForAutomationMutation, AutomationsPreviewStartForAutomationMutationVariables>;
export const AutomationsPreviewMessagesDocument = new TypedDocumentString(`
query AutomationsPreviewMessages($botID: BotID!, $conversationID: ConversationID!, $first: Int, $after: MessagesCursor) {
  bot(id: $botID) {
    id
    conversation(conversationID: $conversationID) {
      id
      platform
      messages(first: $first, after: $after) {
        edges {
          cursor
          node {
            ...AutomationsPvMessage
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewMessagesQuery, AutomationsPreviewMessagesQueryVariables>;
export const AutomationsPreviewMessageAddedDocument = new TypedDocumentString(`
subscription AutomationsPreviewMessageAdded($botID: BotID!, $conversationID: ConversationID!) {
  messageAdded(botID: $botID, conversationID: $conversationID) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewMessageAddedSubscription, AutomationsPreviewMessageAddedSubscriptionVariables>;
export const AutomationsPreviewMessageUpdatedDocument = new TypedDocumentString(`
subscription AutomationsPreviewMessageUpdated($botID: BotID!, $conversationID: ConversationID!) {
  messageUpdated(botID: $botID, conversationID: $conversationID) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewMessageUpdatedSubscription, AutomationsPreviewMessageUpdatedSubscriptionVariables>;
export const AutomationsPreviewWhatsAppTextSendDocument = new TypedDocumentString(`
mutation AutomationsPreviewWhatsAppTextSend($botID: BotID!, $conversationID: ConversationID!, $message: WhatsAppTextMessageSendInput!) {
  previewResponsesWhatsappTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewWhatsAppTextSendMutation, AutomationsPreviewWhatsAppTextSendMutationVariables>;
export const AutomationsPreviewWidgetTextSendDocument = new TypedDocumentString(`
mutation AutomationsPreviewWidgetTextSend($botID: BotID!, $conversationID: ConversationID!, $message: WidgetTextMessageSendInput!) {
  previewResponsesWidgetTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewWidgetTextSendMutation, AutomationsPreviewWidgetTextSendMutationVariables>;
export const AutomationsPreviewInstagramTextSendDocument = new TypedDocumentString(`
mutation AutomationsPreviewInstagramTextSend($botID: BotID!, $conversationID: ConversationID!, $message: InstagramTextMessageSendInput!) {
  previewResponsesInstagramTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewInstagramTextSendMutation, AutomationsPreviewInstagramTextSendMutationVariables>;
export const AutomationsPreviewTikTokTextSendDocument = new TypedDocumentString(`
mutation AutomationsPreviewTikTokTextSend($botID: BotID!, $conversationID: ConversationID!, $message: TikTokTextMessageSendInput!) {
  previewResponsesTikTokTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewTikTokTextSendMutation, AutomationsPreviewTikTokTextSendMutationVariables>;
export const AutomationsPreviewFacebookTextSendDocument = new TypedDocumentString(`
mutation AutomationsPreviewFacebookTextSend($botID: BotID!, $conversationID: ConversationID!, $message: FacebookTextMessageSendInput!) {
  previewResponsesFacebookTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...AutomationsPvMessage
  }
}
${AutomationsPvMessageFragmentDoc}`) as unknown as TypedDocumentString<AutomationsPreviewFacebookTextSendMutation, AutomationsPreviewFacebookTextSendMutationVariables>;