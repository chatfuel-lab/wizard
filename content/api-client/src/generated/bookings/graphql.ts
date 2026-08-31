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

export type BookingFileRefFragment = { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null };

type BookingServiceRef_DeletedGoodsService_Fragment = { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null };

type BookingServiceRef_GoodsService_Fragment = { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null };

export type BookingServiceRefFragment = BookingServiceRef_DeletedGoodsService_Fragment | BookingServiceRef_GoodsService_Fragment;

type BookingSpecialistRef_DeletedSpecialist_Fragment = { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } };

type BookingSpecialistRef_Specialist_Fragment = { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } };

export type BookingSpecialistRefFragment = BookingSpecialistRef_DeletedSpecialist_Fragment | BookingSpecialistRef_Specialist_Fragment;

type BookingContactRef_FacebookContact_Fragment = { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null };

type BookingContactRef_InstagramContact_Fragment = { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null };

type BookingContactRef_TikTokContact_Fragment = { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null };

type BookingContactRef_UnavailableContact_Fragment = { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null };

type BookingContactRef_WhatsappContact_Fragment = { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null };

type BookingContactRef_WidgetContact_Fragment = { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null };

export type BookingContactRefFragment = BookingContactRef_FacebookContact_Fragment | BookingContactRef_InstagramContact_Fragment | BookingContactRef_TikTokContact_Fragment | BookingContactRef_UnavailableContact_Fragment | BookingContactRef_WhatsappContact_Fragment | BookingContactRef_WidgetContact_Fragment;

export type BookingInlineContactInfoFragment = { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null };

type BookingInfo_Booking_Fragment = { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null };

type BookingInfo_BookingWithGoogleCalendarRef_Fragment = { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null };

export type BookingInfoFragment = BookingInfo_Booking_Fragment | BookingInfo_BookingWithGoogleCalendarRef_Fragment;

export type BookingServiceFullFragment = { __typename?: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> };

export type BookingDayHoursFragment = { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null };

export type BookingScheduleInfoFragment = { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null };

export type BookingTaskInfoFragment = { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } };

export type BookingSpecialistFullFragment = { __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null };

export type BookingConfigInfoFragment = { __typename?: 'FuelyBookingConfig', notificationChannel: FuelyBookingNotificationChannel, bookingConfirmation: boolean, bookingConfirmationAdditionalInfo: string, twoHoursAppointment: boolean, twoHoursAppointmentAdditionalInfo: string, twentyFourHoursAppointment: boolean, twentyFourHoursAppointmentAdditionalInfo: string, locale: DashboardLocale, aiAutonomyLevel: FuelyBookingAiAutonomyLevel, calendarLandingURL?: string | null };

export type BookingsRangeQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  startTime: Scalars['Time']['input'];
  endTime: Scalars['Time']['input'];
}>;


export type BookingsRangeQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, bookingsV2: Array<{ __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } | { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null }> } };

export type BookingGetQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  bookingID: Scalars['BookingID']['input'];
}>;


export type BookingGetQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, bookingV2: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } | { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } } };

export type BookingInlineContactSearchQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  phoneNumber: Scalars['String']['input'];
}>;


export type BookingInlineContactSearchQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null } };

export type BookingServicesQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingServicesQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct' } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }> } };

export type BookingSpecialistsQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingSpecialistsQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null }> } };

export type BookingAvailabilityQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  serviceID: Scalars['GoodsItemID']['input'];
  date: Scalars['String']['input'];
}>;


export type BookingAvailabilityQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, goodsService: { __typename: 'DeletedGoodsService' } | { __typename: 'GoodsService', id: string, bookingAvailableStartTime: Array<{ __typename?: 'BookingAvailableStartTimeBySpecialist', specialistID: string, date: string, hasSchedule: boolean, isWorkingDay: boolean, availableStartTime: Array<{ __typename?: 'BookingAvailableStartTimePeriod', start: string, end: string }> }> } } };

export type BookingContactsSearchQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first: Scalars['Int']['input'];
  textInputFilter?: InputMaybe<Scalars['String']['input']>;
}>;


export type BookingContactsSearchQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, contactChatsConnection: { __typename?: 'ContactConnection', edges: Array<{ __typename?: 'ContactEdge', node: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } }> } } };

export type BookingConfigQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingConfigQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, timezone?: string | null, countryCode?: string | null, fuelyConfig?: { __typename?: 'FuelyConfig', booking: { __typename?: 'FuelyBookingConfig', notificationChannel: FuelyBookingNotificationChannel, bookingConfirmation: boolean, bookingConfirmationAdditionalInfo: string, twoHoursAppointment: boolean, twoHoursAppointmentAdditionalInfo: string, twentyFourHoursAppointment: boolean, twentyFourHoursAppointmentAdditionalInfo: string, locale: DashboardLocale, aiAutonomyLevel: FuelyBookingAiAutonomyLevel, calendarLandingURL?: string | null } } | null } };

export type BookingTaskQueryVariables = Exact<{
  taskID: Scalars['TaskID']['input'];
}>;


export type BookingTaskQuery = { __typename?: 'Query', getTask: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } };

export type BookingGoogleCalendarLinkInfoQueryVariables = Exact<{
  linkID: Scalars['SpecialistGoogleCalendarLinkID']['input'];
}>;


export type BookingGoogleCalendarLinkInfoQuery = { __typename?: 'Query', specialistGoogleCalendarLinkInfo: { __typename?: 'SpecialistGoogleCalendarLinkInfo', id: string, specialistName: string, botTitle: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } };

export type BookingCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  req: BookingInput;
}>;


export type BookingCreateMutation = { __typename?: 'Mutation', bookingCreateV2: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } | { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } };

export type BookingUpdateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  bookingID: Scalars['BookingID']['input'];
  req: BookingUpdateInput;
}>;


export type BookingUpdateMutation = { __typename?: 'Mutation', bookingUpdateV2: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } | { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } };

export type BookingStatusResolveMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  bookingID: Scalars['BookingID']['input'];
  status: BookingStatus;
}>;


export type BookingStatusResolveMutation = { __typename?: 'Mutation', bookingStatusResolveV2: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } | { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } };

export type BookingDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  bookingID: Scalars['BookingID']['input'];
}>;


export type BookingDeleteMutation = { __typename?: 'Mutation', bookingDeleteV2: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } | { __typename: 'BookingWithGoogleCalendarRef', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, googleCalendarRefData: { __typename?: 'GoogleCalendarRefData', eventID: string, summary: string, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } }, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } };

export type BookingInlineContactSetNoteMutationVariables = Exact<{
  inlineContactID: Scalars['InlineContactID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
}>;


export type BookingInlineContactSetNoteMutation = { __typename?: 'Mutation', bookingInlineContactSetNote: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } };

export type BookingContactSetNoteMutationVariables = Exact<{
  contactID: Scalars['ContactID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
}>;


export type BookingContactSetNoteMutation = { __typename?: 'Mutation', contactSetNote: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } };

export type BookingWhatsappContactCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  data: WhatsappContactCreateInput;
}>;


export type BookingWhatsappContactCreateMutation = { __typename?: 'Mutation', whatsappContactCreateV2: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } };

export type BookingServiceCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  service: GoodsServiceInput;
}>;


export type BookingServiceCreateMutation = { __typename?: 'Mutation', goodsServiceCreate: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct' } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }> } };

export type BookingServiceUpdateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  serviceID: Scalars['GoodsItemID']['input'];
  service: GoodsServiceInput;
}>;


export type BookingServiceUpdateMutation = { __typename?: 'Mutation', goodsServiceUpdate: { __typename?: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } };

export type BookingServiceDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  serviceID: Scalars['GoodsItemID']['input'];
}>;


export type BookingServiceDeleteMutation = { __typename?: 'Mutation', goodsServiceDelete: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct' } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }> } };

export type BookingSpecialistCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  info: SpecialistInfoInput;
}>;


export type BookingSpecialistCreateMutation = { __typename?: 'Mutation', specialistCreate: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null }> } };

export type BookingSpecialistUpdateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
  info: SpecialistInfoInput;
}>;


export type BookingSpecialistUpdateMutation = { __typename?: 'Mutation', specialistUpdate: { __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null } };

export type BookingSpecialistDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
}>;


export type BookingSpecialistDeleteMutation = { __typename?: 'Mutation', specialistDelete: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null }> } };

export type BookingGoogleCalendarLinkCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
}>;


export type BookingGoogleCalendarLinkCreateMutation = { __typename?: 'Mutation', specialistCreateGoogleCalendarConnectionLink: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } };

export type BookingGoogleCalendarLinkDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
}>;


export type BookingGoogleCalendarLinkDeleteMutation = { __typename?: 'Mutation', specialistDeleteGoogleCalendarConnectionLink: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null }> } };

export type BookingGoogleCalendarDisconnectMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
  googleCalendarID: Scalars['GoogleCalendarID']['input'];
}>;


export type BookingGoogleCalendarDisconnectMutation = { __typename?: 'Mutation', specialistDisconnectGoogleCalendar: { __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }>, connectedGoogleCalendar?: { __typename?: 'GoogleCalendar', id: string, summary: string } | null, googleCalendarConnectionLink?: { __typename?: 'SpecialistGoogleCalendarLink', id: string, createdBy: { __typename?: 'PublicUserAccount', id: string, name: string } } | null, latestGoogleCalendarSyncTask?: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } | null } };

export type BookingGoogleCalendarSyncStartMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
}>;


export type BookingGoogleCalendarSyncStartMutation = { __typename?: 'Mutation', specialistStartGoogleCalendarSync: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } };

export type BookingConfigSetNotificationChannelMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  channel: FuelyBookingNotificationChannel;
}>;


export type BookingConfigSetNotificationChannelMutation = { __typename?: 'Mutation', fuelyConfigBookingUpdateNotificationChannel: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', booking: { __typename?: 'FuelyBookingConfig', notificationChannel: FuelyBookingNotificationChannel, bookingConfirmation: boolean, bookingConfirmationAdditionalInfo: string, twoHoursAppointment: boolean, twoHoursAppointmentAdditionalInfo: string, twentyFourHoursAppointment: boolean, twentyFourHoursAppointmentAdditionalInfo: string, locale: DashboardLocale, aiAutonomyLevel: FuelyBookingAiAutonomyLevel, calendarLandingURL?: string | null } } | null } };

export type BookingConfigSetConfirmationMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  enabled: Scalars['Boolean']['input'];
  additionalInfo?: InputMaybe<Scalars['String']['input']>;
}>;


export type BookingConfigSetConfirmationMutation = { __typename?: 'Mutation', fuelyConfigBookingUpdateConfirmation: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', booking: { __typename?: 'FuelyBookingConfig', notificationChannel: FuelyBookingNotificationChannel, bookingConfirmation: boolean, bookingConfirmationAdditionalInfo: string, twoHoursAppointment: boolean, twoHoursAppointmentAdditionalInfo: string, twentyFourHoursAppointment: boolean, twentyFourHoursAppointmentAdditionalInfo: string, locale: DashboardLocale, aiAutonomyLevel: FuelyBookingAiAutonomyLevel, calendarLandingURL?: string | null } } | null } };

export type BookingConfigSetAppointmentsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  update: FuelyConfigBookingAppointmentsUpdateInput;
}>;


export type BookingConfigSetAppointmentsMutation = { __typename?: 'Mutation', fuelyConfigBookingUpdateAppointments: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', booking: { __typename?: 'FuelyBookingConfig', notificationChannel: FuelyBookingNotificationChannel, bookingConfirmation: boolean, bookingConfirmationAdditionalInfo: string, twoHoursAppointment: boolean, twoHoursAppointmentAdditionalInfo: string, twentyFourHoursAppointment: boolean, twentyFourHoursAppointmentAdditionalInfo: string, locale: DashboardLocale, aiAutonomyLevel: FuelyBookingAiAutonomyLevel, calendarLandingURL?: string | null } } | null } };

export type BookingConfigSetLocaleMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  locale: DashboardLocale;
}>;


export type BookingConfigSetLocaleMutation = { __typename?: 'Mutation', fuelyConfigBookingUpdateLocale: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', booking: { __typename?: 'FuelyBookingConfig', notificationChannel: FuelyBookingNotificationChannel, bookingConfirmation: boolean, bookingConfirmationAdditionalInfo: string, twoHoursAppointment: boolean, twoHoursAppointmentAdditionalInfo: string, twentyFourHoursAppointment: boolean, twentyFourHoursAppointmentAdditionalInfo: string, locale: DashboardLocale, aiAutonomyLevel: FuelyBookingAiAutonomyLevel, calendarLandingURL?: string | null } } | null } };

export type BookingAiAutonomyQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingAiAutonomyQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, fuelyAutomations: Array<{ __typename?: 'FuelyAutomation', id: string, isBase: boolean, settings: Array<{ __typename: 'FuelySettingBookingRules', autonomyLevel: FuelySettingBookingRulesAutonomyLevel } | { __typename: 'FuelySettingCatalogImages' } | { __typename: 'FuelySettingCollectContactInfo' } | { __typename: 'FuelySettingFollowUps' } | { __typename: 'FuelySettingIncomingMessages' } | { __typename: 'FuelySettingKeywords' } | { __typename: 'FuelySettingListOfAds' } | { __typename: 'FuelySettingListOfPosts' } | { __typename: 'FuelySettingListOfStories' } | { __typename: 'FuelySettingMessageDelays' } | { __typename: 'FuelySettingPrivateReply' } | { __typename: 'FuelySettingPublicReply' } | { __typename: 'FuelySettingRefLinks' } | { __typename: 'FuelySettingSendEventsToMeta' } | { __typename: 'FuelySettingSwitchToHuman' } | { __typename: 'FuelySettingWhenAIReplies' }> }> } };

export type BookingTimezoneSetMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  timezone: Scalars['BotTimezone']['input'];
}>;


export type BookingTimezoneSetMutation = { __typename?: 'Mutation', botUpdateTimezone: { __typename?: 'Bot', id: string, timezone?: string | null } };

export type BookingAddedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingAddedSubscription = { __typename?: 'Subscription', bookingAdded: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } };

export type BookingUpdatedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingUpdatedSubscription = { __typename?: 'Subscription', bookingUpdated: { __typename: 'Booking', id: string, startTime: string, endTime: string, status: BookingStatus, contact?: { __typename: 'FacebookContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'InstagramContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'TikTokContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WhatsappContact', phone: string, id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | { __typename: 'WidgetContact', id: string, name: string, profilePictureUrl?: string | null, note?: string | null, conversation?: { __typename: 'Conversation', id: string } | null } | null, inlineContact?: { __typename?: 'BookingInlineContact', id: string, name: string, phoneNumber: string, note?: string | null } | null, service?: { __typename: 'DeletedGoodsService', id: string, title: string, durationSeconds: number, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | { __typename: 'GoodsService', id: string, title: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null } | null, specialist?: { __typename: 'DeletedSpecialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null } } | { __typename: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null } } | null } };

export type BookingDeletedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BookingDeletedSubscription = { __typename?: 'Subscription', bookingDeleted: string };

export type BookingTaskUpdatedSubscriptionVariables = Exact<{
  taskID: Scalars['TaskID']['input'];
}>;


export type BookingTaskUpdatedSubscription = { __typename?: 'Subscription', taskUpdated: { __typename?: 'Task', id: string, completedPoints: number, totalPoints: number, deadline: string, statuses: Array<{ __typename?: 'TaskStatus', type: TaskStatusType, startedAt: string }>, data: { __typename: 'BookingGoogleCalendarSync', id: string, startedAt: string, finishedAt?: string | null, isFailed: boolean, syncedEventsCount: number, calendar: { __typename?: 'GoogleCalendar', id: string, summary: string } } | { __typename: 'CSVContactsExport' } | { __typename: 'UnavailableTaskData' } } };

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
export const BookingServiceRefFragmentDoc = new TypedDocumentString(`
fragment BookingServiceRef on CommonGoodsService {
  __typename
  ... on GoodsService {
    id
    title
    durationSeconds
    isAvailable
    price {
      amount
      currency
    }
  }
  ... on DeletedGoodsService {
    id
    title
    durationSeconds
    price {
      amount
      currency
    }
  }
}`, {"fragmentName":"BookingServiceRef"}) as unknown as TypedDocumentString<BookingServiceRefFragment, unknown>;
export const BookingFileRefFragmentDoc = new TypedDocumentString(`
fragment BookingFileRef on File {
  id
  url
  type
  status
  size
}`, {"fragmentName":"BookingFileRef"}) as unknown as TypedDocumentString<BookingFileRefFragment, unknown>;
export const BookingSpecialistRefFragmentDoc = new TypedDocumentString(`
fragment BookingSpecialistRef on CommonSpecialist {
  __typename
  ... on Specialist {
    id
    profile {
      firstName
      lastName
      logo {
        ...BookingFileRef
      }
    }
  }
  ... on DeletedSpecialist {
    id
    profile {
      firstName
      lastName
    }
  }
}`, {"fragmentName":"BookingSpecialistRef"}) as unknown as TypedDocumentString<BookingSpecialistRefFragment, unknown>;
export const BookingContactRefFragmentDoc = new TypedDocumentString(`
fragment BookingContactRef on Contact {
  __typename
  id
  name
  profilePictureUrl
  note
  conversation {
    __typename
    id
  }
  ... on WhatsappContact {
    phone
  }
}`, {"fragmentName":"BookingContactRef"}) as unknown as TypedDocumentString<BookingContactRefFragment, unknown>;
export const BookingInlineContactInfoFragmentDoc = new TypedDocumentString(`
fragment BookingInlineContactInfo on BookingInlineContact {
  id
  name
  phoneNumber
  note
}`, {"fragmentName":"BookingInlineContactInfo"}) as unknown as TypedDocumentString<BookingInlineContactInfoFragment, unknown>;
export const BookingInfoFragmentDoc = new TypedDocumentString(`
fragment BookingInfo on BookingBase {
  __typename
  id
  startTime
  endTime
  status
  service {
    ...BookingServiceRef
  }
  specialist {
    ...BookingSpecialistRef
  }
  ... on Booking {
    contact {
      ...BookingContactRef
    }
    inlineContact {
      ...BookingInlineContactInfo
    }
  }
  ... on BookingWithGoogleCalendarRef {
    contact {
      ...BookingContactRef
    }
    inlineContact {
      ...BookingInlineContactInfo
    }
    googleCalendarRefData {
      calendar {
        id
        summary
      }
      eventID
      summary
    }
  }
}`, {"fragmentName":"BookingInfo"}) as unknown as TypedDocumentString<BookingInfoFragment, unknown>;
export const BookingServiceFullFragmentDoc = new TypedDocumentString(`
fragment BookingServiceFull on GoodsService {
  id
  title
  description
  durationSeconds
  isAvailable
  price {
    amount
    currency
  }
  images {
    ...BookingFileRef
  }
}`, {"fragmentName":"BookingServiceFull"}) as unknown as TypedDocumentString<BookingServiceFullFragment, unknown>;
export const BookingDayHoursFragmentDoc = new TypedDocumentString(`
fragment BookingDayHours on SpecialistDaySchedule {
  enabled
  start
  end
  break {
    start
    end
  }
}`, {"fragmentName":"BookingDayHours"}) as unknown as TypedDocumentString<BookingDayHoursFragment, unknown>;
export const BookingScheduleInfoFragmentDoc = new TypedDocumentString(`
fragment BookingScheduleInfo on SpecialistSchedule {
  enabled
  sun {
    ...BookingDayHours
  }
  mon {
    ...BookingDayHours
  }
  tue {
    ...BookingDayHours
  }
  wed {
    ...BookingDayHours
  }
  thu {
    ...BookingDayHours
  }
  fri {
    ...BookingDayHours
  }
  sat {
    ...BookingDayHours
  }
}`, {"fragmentName":"BookingScheduleInfo"}) as unknown as TypedDocumentString<BookingScheduleInfoFragment, unknown>;
export const BookingTaskInfoFragmentDoc = new TypedDocumentString(`
fragment BookingTaskInfo on Task {
  id
  statuses {
    type
    startedAt
  }
  completedPoints
  totalPoints
  deadline
  data {
    __typename
    ... on BookingGoogleCalendarSync {
      id
      calendar {
        id
        summary
      }
      startedAt
      finishedAt
      isFailed
      syncedEventsCount
    }
  }
}`, {"fragmentName":"BookingTaskInfo"}) as unknown as TypedDocumentString<BookingTaskInfoFragment, unknown>;
export const BookingSpecialistFullFragmentDoc = new TypedDocumentString(`
fragment BookingSpecialistFull on Specialist {
  id
  profile {
    firstName
    lastName
    aboutInfo
    logo {
      ...BookingFileRef
    }
  }
  schedule {
    ...BookingScheduleInfo
  }
  services {
    id
  }
  connectedGoogleCalendar {
    id
    summary
  }
  googleCalendarConnectionLink {
    id
    createdBy {
      id
      name
    }
  }
  latestGoogleCalendarSyncTask(botID: $botID) {
    ...BookingTaskInfo
  }
}`, {"fragmentName":"BookingSpecialistFull"}) as unknown as TypedDocumentString<BookingSpecialistFullFragment, unknown>;
export const BookingConfigInfoFragmentDoc = new TypedDocumentString(`
fragment BookingConfigInfo on FuelyBookingConfig {
  notificationChannel
  bookingConfirmation
  bookingConfirmationAdditionalInfo
  twoHoursAppointment
  twoHoursAppointmentAdditionalInfo
  twentyFourHoursAppointment
  twentyFourHoursAppointmentAdditionalInfo
  locale
  aiAutonomyLevel
  calendarLandingURL
}`, {"fragmentName":"BookingConfigInfo"}) as unknown as TypedDocumentString<BookingConfigInfoFragment, unknown>;
export const BookingsRangeDocument = new TypedDocumentString(`
query BookingsRange($botID: BotID!, $startTime: Time!, $endTime: Time!) {
  bot(id: $botID) {
    id
    bookingsV2(startTime: $startTime, endTime: $endTime) {
      ...BookingInfo
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingsRangeQuery, BookingsRangeQueryVariables>;
export const BookingGetDocument = new TypedDocumentString(`
query BookingGet($botID: BotID!, $bookingID: BookingID!) {
  bot(id: $botID) {
    id
    bookingV2(id: $bookingID) {
      ...BookingInfo
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingGetQuery, BookingGetQueryVariables>;
export const BookingInlineContactSearchDocument = new TypedDocumentString(`
query BookingInlineContactSearch($botID: BotID!, $phoneNumber: String!) {
  bot(id: $botID) {
    id
    inlineContact(phoneNumber: $phoneNumber) {
      ...BookingInlineContactInfo
    }
  }
}
${BookingInlineContactInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingInlineContactSearchQuery, BookingInlineContactSearchQueryVariables>;
export const BookingServicesDocument = new TypedDocumentString(`
query BookingServices($botID: BotID!) {
  bot(id: $botID) {
    id
    goodsCatalog {
      __typename
      ...BookingServiceFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceFullFragmentDoc}`) as unknown as TypedDocumentString<BookingServicesQuery, BookingServicesQueryVariables>;
export const BookingSpecialistsDocument = new TypedDocumentString(`
query BookingSpecialists($botID: BotID!) {
  bot(id: $botID) {
    id
    specialists {
      ...BookingSpecialistFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingDayHoursFragmentDoc}
${BookingScheduleInfoFragmentDoc}
${BookingTaskInfoFragmentDoc}
${BookingSpecialistFullFragmentDoc}`) as unknown as TypedDocumentString<BookingSpecialistsQuery, BookingSpecialistsQueryVariables>;
export const BookingAvailabilityDocument = new TypedDocumentString(`
query BookingAvailability($botID: BotID!, $serviceID: GoodsItemID!, $date: String!) {
  bot(id: $botID) {
    id
    goodsService(id: $serviceID) {
      __typename
      ... on GoodsService {
        id
        bookingAvailableStartTime(botID: $botID, date: $date) {
          specialistID
          date
          hasSchedule
          isWorkingDay
          availableStartTime {
            start
            end
          }
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<BookingAvailabilityQuery, BookingAvailabilityQueryVariables>;
export const BookingContactsSearchDocument = new TypedDocumentString(`
query BookingContactsSearch($botID: BotID!, $first: Int!, $textInputFilter: String) {
  bot(id: $botID) {
    id
    contactChatsConnection(
      first: $first
      assigneeFilter: {type: Any}
      unreadOnly: false
      salesStageV2Filter: []
      textInputFilter: $textInputFilter
    ) {
      edges {
        node {
          ...BookingContactRef
        }
      }
    }
  }
}
${BookingContactRefFragmentDoc}`) as unknown as TypedDocumentString<BookingContactsSearchQuery, BookingContactsSearchQueryVariables>;
export const BookingConfigDocument = new TypedDocumentString(`
query BookingConfig($botID: BotID!) {
  bot(id: $botID) {
    id
    timezone
    countryCode
    fuelyConfig {
      booking {
        ...BookingConfigInfo
      }
    }
  }
}
${BookingConfigInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingConfigQuery, BookingConfigQueryVariables>;
export const BookingTaskDocument = new TypedDocumentString(`
query BookingTask($taskID: TaskID!) {
  getTask(id: $taskID) {
    ...BookingTaskInfo
  }
}
${BookingTaskInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingTaskQuery, BookingTaskQueryVariables>;
export const BookingGoogleCalendarLinkInfoDocument = new TypedDocumentString(`
query BookingGoogleCalendarLinkInfo($linkID: SpecialistGoogleCalendarLinkID!) {
  specialistGoogleCalendarLinkInfo(linkID: $linkID) {
    id
    specialistName
    botTitle
    createdBy {
      id
      name
    }
  }
}`) as unknown as TypedDocumentString<BookingGoogleCalendarLinkInfoQuery, BookingGoogleCalendarLinkInfoQueryVariables>;
export const BookingCreateDocument = new TypedDocumentString(`
mutation BookingCreate($botID: BotID!, $req: BookingInput!) {
  bookingCreateV2(botID: $botID, req: $req) {
    ...BookingInfo
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingCreateMutation, BookingCreateMutationVariables>;
export const BookingUpdateDocument = new TypedDocumentString(`
mutation BookingUpdate($botID: BotID!, $bookingID: BookingID!, $req: BookingUpdateInput!) {
  bookingUpdateV2(botID: $botID, id: $bookingID, req: $req) {
    ...BookingInfo
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingUpdateMutation, BookingUpdateMutationVariables>;
export const BookingStatusResolveDocument = new TypedDocumentString(`
mutation BookingStatusResolve($botID: BotID!, $bookingID: BookingID!, $status: BookingStatus!) {
  bookingStatusResolveV2(botID: $botID, bookingID: $bookingID, status: $status) {
    ...BookingInfo
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingStatusResolveMutation, BookingStatusResolveMutationVariables>;
export const BookingDeleteDocument = new TypedDocumentString(`
mutation BookingDelete($botID: BotID!, $bookingID: BookingID!) {
  bookingDeleteV2(botID: $botID, id: $bookingID) {
    ...BookingInfo
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingDeleteMutation, BookingDeleteMutationVariables>;
export const BookingInlineContactSetNoteDocument = new TypedDocumentString(`
mutation BookingInlineContactSetNote($inlineContactID: InlineContactID!, $note: String) {
  bookingInlineContactSetNote(id: $inlineContactID, note: $note) {
    ...BookingInlineContactInfo
  }
}
${BookingInlineContactInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingInlineContactSetNoteMutation, BookingInlineContactSetNoteMutationVariables>;
export const BookingContactSetNoteDocument = new TypedDocumentString(`
mutation BookingContactSetNote($contactID: ContactID!, $note: String) {
  contactSetNote(id: $contactID, note: $note) {
    ...BookingContactRef
  }
}
${BookingContactRefFragmentDoc}`) as unknown as TypedDocumentString<BookingContactSetNoteMutation, BookingContactSetNoteMutationVariables>;
export const BookingWhatsappContactCreateDocument = new TypedDocumentString(`
mutation BookingWhatsappContactCreate($botID: BotID!, $data: WhatsappContactCreateInput!) {
  whatsappContactCreateV2(botID: $botID, data: $data) {
    ...BookingContactRef
  }
}
${BookingContactRefFragmentDoc}`) as unknown as TypedDocumentString<BookingWhatsappContactCreateMutation, BookingWhatsappContactCreateMutationVariables>;
export const BookingServiceCreateDocument = new TypedDocumentString(`
mutation BookingServiceCreate($botID: BotID!, $service: GoodsServiceInput!) {
  goodsServiceCreate(botID: $botID, service: $service) {
    id
    goodsCatalog {
      __typename
      ...BookingServiceFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceFullFragmentDoc}`) as unknown as TypedDocumentString<BookingServiceCreateMutation, BookingServiceCreateMutationVariables>;
export const BookingServiceUpdateDocument = new TypedDocumentString(`
mutation BookingServiceUpdate($botID: BotID!, $serviceID: GoodsItemID!, $service: GoodsServiceInput!) {
  goodsServiceUpdate(botID: $botID, itemID: $serviceID, service: $service) {
    ...BookingServiceFull
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceFullFragmentDoc}`) as unknown as TypedDocumentString<BookingServiceUpdateMutation, BookingServiceUpdateMutationVariables>;
export const BookingServiceDeleteDocument = new TypedDocumentString(`
mutation BookingServiceDelete($botID: BotID!, $serviceID: GoodsItemID!) {
  goodsServiceDelete(botID: $botID, itemID: $serviceID) {
    id
    goodsCatalog {
      __typename
      ...BookingServiceFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceFullFragmentDoc}`) as unknown as TypedDocumentString<BookingServiceDeleteMutation, BookingServiceDeleteMutationVariables>;
export const BookingSpecialistCreateDocument = new TypedDocumentString(`
mutation BookingSpecialistCreate($botID: BotID!, $info: SpecialistInfoInput!) {
  specialistCreate(botID: $botID, info: $info) {
    id
    specialists {
      ...BookingSpecialistFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingDayHoursFragmentDoc}
${BookingScheduleInfoFragmentDoc}
${BookingTaskInfoFragmentDoc}
${BookingSpecialistFullFragmentDoc}`) as unknown as TypedDocumentString<BookingSpecialistCreateMutation, BookingSpecialistCreateMutationVariables>;
export const BookingSpecialistUpdateDocument = new TypedDocumentString(`
mutation BookingSpecialistUpdate($botID: BotID!, $specialistID: SpecialistID!, $info: SpecialistInfoInput!) {
  specialistUpdate(botID: $botID, specialistID: $specialistID, info: $info) {
    ...BookingSpecialistFull
  }
}
${BookingFileRefFragmentDoc}
${BookingDayHoursFragmentDoc}
${BookingScheduleInfoFragmentDoc}
${BookingTaskInfoFragmentDoc}
${BookingSpecialistFullFragmentDoc}`) as unknown as TypedDocumentString<BookingSpecialistUpdateMutation, BookingSpecialistUpdateMutationVariables>;
export const BookingSpecialistDeleteDocument = new TypedDocumentString(`
mutation BookingSpecialistDelete($botID: BotID!, $specialistID: SpecialistID!) {
  specialistDelete(botID: $botID, specialistID: $specialistID) {
    id
    specialists {
      ...BookingSpecialistFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingDayHoursFragmentDoc}
${BookingScheduleInfoFragmentDoc}
${BookingTaskInfoFragmentDoc}
${BookingSpecialistFullFragmentDoc}`) as unknown as TypedDocumentString<BookingSpecialistDeleteMutation, BookingSpecialistDeleteMutationVariables>;
export const BookingGoogleCalendarLinkCreateDocument = new TypedDocumentString(`
mutation BookingGoogleCalendarLinkCreate($botID: BotID!, $specialistID: SpecialistID!) {
  specialistCreateGoogleCalendarConnectionLink(
    botID: $botID
    specialistID: $specialistID
  ) {
    id
    createdBy {
      id
      name
    }
  }
}`) as unknown as TypedDocumentString<BookingGoogleCalendarLinkCreateMutation, BookingGoogleCalendarLinkCreateMutationVariables>;
export const BookingGoogleCalendarLinkDeleteDocument = new TypedDocumentString(`
mutation BookingGoogleCalendarLinkDelete($botID: BotID!, $specialistID: SpecialistID!) {
  specialistDeleteGoogleCalendarConnectionLink(
    botID: $botID
    specialistID: $specialistID
  ) {
    id
    specialists {
      ...BookingSpecialistFull
    }
  }
}
${BookingFileRefFragmentDoc}
${BookingDayHoursFragmentDoc}
${BookingScheduleInfoFragmentDoc}
${BookingTaskInfoFragmentDoc}
${BookingSpecialistFullFragmentDoc}`) as unknown as TypedDocumentString<BookingGoogleCalendarLinkDeleteMutation, BookingGoogleCalendarLinkDeleteMutationVariables>;
export const BookingGoogleCalendarDisconnectDocument = new TypedDocumentString(`
mutation BookingGoogleCalendarDisconnect($botID: BotID!, $specialistID: SpecialistID!, $googleCalendarID: GoogleCalendarID!) {
  specialistDisconnectGoogleCalendar(
    botID: $botID
    specialistID: $specialistID
    googleCalendarID: $googleCalendarID
  ) {
    ...BookingSpecialistFull
  }
}
${BookingFileRefFragmentDoc}
${BookingDayHoursFragmentDoc}
${BookingScheduleInfoFragmentDoc}
${BookingTaskInfoFragmentDoc}
${BookingSpecialistFullFragmentDoc}`) as unknown as TypedDocumentString<BookingGoogleCalendarDisconnectMutation, BookingGoogleCalendarDisconnectMutationVariables>;
export const BookingGoogleCalendarSyncStartDocument = new TypedDocumentString(`
mutation BookingGoogleCalendarSyncStart($botID: BotID!, $specialistID: SpecialistID!) {
  specialistStartGoogleCalendarSync(botID: $botID, specialistID: $specialistID) {
    ...BookingTaskInfo
  }
}
${BookingTaskInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingGoogleCalendarSyncStartMutation, BookingGoogleCalendarSyncStartMutationVariables>;
export const BookingConfigSetNotificationChannelDocument = new TypedDocumentString(`
mutation BookingConfigSetNotificationChannel($botID: BotID!, $channel: FuelyBookingNotificationChannel!) {
  fuelyConfigBookingUpdateNotificationChannel(botID: $botID, channel: $channel) {
    id
    fuelyConfig {
      booking {
        ...BookingConfigInfo
      }
    }
  }
}
${BookingConfigInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingConfigSetNotificationChannelMutation, BookingConfigSetNotificationChannelMutationVariables>;
export const BookingConfigSetConfirmationDocument = new TypedDocumentString(`
mutation BookingConfigSetConfirmation($botID: BotID!, $enabled: Boolean!, $additionalInfo: String) {
  fuelyConfigBookingUpdateConfirmation(
    botID: $botID
    enabled: $enabled
    additionalInfo: $additionalInfo
  ) {
    id
    fuelyConfig {
      booking {
        ...BookingConfigInfo
      }
    }
  }
}
${BookingConfigInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingConfigSetConfirmationMutation, BookingConfigSetConfirmationMutationVariables>;
export const BookingConfigSetAppointmentsDocument = new TypedDocumentString(`
mutation BookingConfigSetAppointments($botID: BotID!, $update: FuelyConfigBookingAppointmentsUpdateInput!) {
  fuelyConfigBookingUpdateAppointments(botID: $botID, update: $update) {
    id
    fuelyConfig {
      booking {
        ...BookingConfigInfo
      }
    }
  }
}
${BookingConfigInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingConfigSetAppointmentsMutation, BookingConfigSetAppointmentsMutationVariables>;
export const BookingConfigSetLocaleDocument = new TypedDocumentString(`
mutation BookingConfigSetLocale($botID: BotID!, $locale: DashboardLocale!) {
  fuelyConfigBookingUpdateLocale(botID: $botID, locale: $locale) {
    id
    fuelyConfig {
      booking {
        ...BookingConfigInfo
      }
    }
  }
}
${BookingConfigInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingConfigSetLocaleMutation, BookingConfigSetLocaleMutationVariables>;
export const BookingAiAutonomyDocument = new TypedDocumentString(`
query BookingAiAutonomy($botID: BotID!) {
  bot(id: $botID) {
    id
    fuelyAutomations(scope: All) {
      id
      isBase
      settings {
        __typename
        ... on FuelySettingBookingRules {
          autonomyLevel
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<BookingAiAutonomyQuery, BookingAiAutonomyQueryVariables>;
export const BookingTimezoneSetDocument = new TypedDocumentString(`
mutation BookingTimezoneSet($botID: BotID!, $timezone: BotTimezone!) {
  botUpdateTimezone(botID: $botID, timezone: $timezone) {
    id
    timezone
  }
}`) as unknown as TypedDocumentString<BookingTimezoneSetMutation, BookingTimezoneSetMutationVariables>;
export const BookingAddedDocument = new TypedDocumentString(`
subscription BookingAdded($botID: BotID!) {
  bookingAdded(botID: $botID) {
    ...BookingInfo
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingAddedSubscription, BookingAddedSubscriptionVariables>;
export const BookingUpdatedDocument = new TypedDocumentString(`
subscription BookingUpdated($botID: BotID!) {
  bookingUpdated(botID: $botID) {
    ...BookingInfo
  }
}
${BookingFileRefFragmentDoc}
${BookingServiceRefFragmentDoc}
${BookingSpecialistRefFragmentDoc}
${BookingContactRefFragmentDoc}
${BookingInlineContactInfoFragmentDoc}
${BookingInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingUpdatedSubscription, BookingUpdatedSubscriptionVariables>;
export const BookingDeletedDocument = new TypedDocumentString(`
subscription BookingDeleted($botID: BotID!) {
  bookingDeleted(botID: $botID)
}`) as unknown as TypedDocumentString<BookingDeletedSubscription, BookingDeletedSubscriptionVariables>;
export const BookingTaskUpdatedDocument = new TypedDocumentString(`
subscription BookingTaskUpdated($taskID: TaskID!) {
  taskUpdated(id: $taskID) {
    ...BookingTaskInfo
  }
}
${BookingTaskInfoFragmentDoc}`) as unknown as TypedDocumentString<BookingTaskUpdatedSubscription, BookingTaskUpdatedSubscriptionVariables>;