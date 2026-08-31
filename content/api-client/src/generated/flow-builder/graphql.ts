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

export type AttrNameFragment = { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType };

export type TStrFragment = { __typename?: 'TemplateStr', parts: Array<{ __typename: 'TemplateStrAttribute', errCode?: string | null, attribute: (
      { __typename?: 'BotAttribute' }
      & AttrNameFragment
    ) } | { __typename: 'TemplateStrText', text: string, errCode?: string | null }> };

export type FileRefFragment = { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null };

type ElementErrors_AiAgentBlockElement_Fragment = { __typename?: 'AiAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_AiAgentCustomBlockElement_Fragment = { __typename?: 'AiAgentCustomBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_ClearContactPropertyBlockElement_Fragment = { __typename?: 'ClearContactPropertyBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_DefaultReplyBlockElement_Fragment = { __typename?: 'DefaultReplyBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_FuelyAiAgentBlockElement_Fragment = { __typename?: 'FuelyAIAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_RedirectToFlowBlockElement_Fragment = { __typename?: 'RedirectToFlowBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_SendJsonBlockElement_Fragment = { __typename?: 'SendJsonBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_SetConditionBlockElement_Fragment = { __typename?: 'SetConditionBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_SetContactPropertyBlockElement_Fragment = { __typename?: 'SetContactPropertyBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_SummarizeChatBlockElement_Fragment = { __typename?: 'SummarizeChatBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_TriggeredMessageBlockElement_Fragment = { __typename?: 'TriggeredMessageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppAudioBlockElement_Fragment = { __typename?: 'WhatsAppAudioBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppDocumentBlockElement_Fragment = { __typename?: 'WhatsAppDocumentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppImageBlockElement_Fragment = { __typename?: 'WhatsAppImageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppListBlockElement_Fragment = { __typename?: 'WhatsAppListBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppOneTimeNotificationBlockElement_Fragment = { __typename?: 'WhatsAppOneTimeNotificationBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppScheduledMessageBlockElement_Fragment = { __typename?: 'WhatsAppScheduledMessageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppTemplateBlockElement_Fragment = { __typename?: 'WhatsAppTemplateBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppTextAndButtonsBlockElement_Fragment = { __typename?: 'WhatsAppTextAndButtonsBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppTextAndUrlBlockElement_Fragment = { __typename?: 'WhatsAppTextAndURLBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppTextBlockElement_Fragment = { __typename?: 'WhatsAppTextBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WhatsAppVideoBlockElement_Fragment = { __typename?: 'WhatsAppVideoBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WidgetEntryPointBlockElement_Fragment = { __typename?: 'WidgetEntryPointBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WidgetImageBlockElement_Fragment = { __typename?: 'WidgetImageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type ElementErrors_WidgetTextAndButtonBlockElement_Fragment = { __typename?: 'WidgetTextAndButtonBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', ruleID: string, code: string, message?: string | null } | { __typename: 'ButtonValidationError', buttonID: string, code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', headerID: string, code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', responseParsingRuleID: string, code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', urlParamID: string, code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', entryID: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

export type ElementErrorsFragment = ElementErrors_AiAgentBlockElement_Fragment | ElementErrors_AiAgentCustomBlockElement_Fragment | ElementErrors_ClearContactPropertyBlockElement_Fragment | ElementErrors_DefaultReplyBlockElement_Fragment | ElementErrors_FuelyAiAgentBlockElement_Fragment | ElementErrors_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment | ElementErrors_RedirectToFlowBlockElement_Fragment | ElementErrors_SendJsonBlockElement_Fragment | ElementErrors_SetConditionBlockElement_Fragment | ElementErrors_SetContactPropertyBlockElement_Fragment | ElementErrors_SummarizeChatBlockElement_Fragment | ElementErrors_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment | ElementErrors_TriggeredMessageBlockElement_Fragment | ElementErrors_WhatsAppAudioBlockElement_Fragment | ElementErrors_WhatsAppDocumentBlockElement_Fragment | ElementErrors_WhatsAppImageBlockElement_Fragment | ElementErrors_WhatsAppListBlockElement_Fragment | ElementErrors_WhatsAppOneTimeNotificationBlockElement_Fragment | ElementErrors_WhatsAppScheduledMessageBlockElement_Fragment | ElementErrors_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment | ElementErrors_WhatsAppTemplateBlockElement_Fragment | ElementErrors_WhatsAppTextAndButtonsBlockElement_Fragment | ElementErrors_WhatsAppTextAndUrlBlockElement_Fragment | ElementErrors_WhatsAppTextBlockElement_Fragment | ElementErrors_WhatsAppVideoBlockElement_Fragment | ElementErrors_WidgetEntryPointBlockElement_Fragment | ElementErrors_WidgetImageBlockElement_Fragment | ElementErrors_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment | ElementErrors_WidgetTextAndButtonBlockElement_Fragment;

export type SegmentFilterPartsFragment = { __typename?: 'Filter', id: string, byAttribute?: { __typename?: 'AttrFilter', attribute: (
      { __typename?: 'BotAttribute' }
      & AttrNameFragment
    ), defaultStrategy?: { __typename?: 'AttrFilterDefaultStrategy', operator: AttrFilterDefaultOperator, comparableValues: Array<string> } | null, dateStrategy?: { __typename?: 'AttrFilterDateStrategy', operator: AttrFilterDateOperator, comparableDate?: string | null } | null } | null, byTag?: { __typename?: 'TagFilter', operator: TagFilterOperator, tagNames: Array<string> } | null, byStoredSegment?: { __typename?: 'StoredSegmentFilter', operator: StoredSegmentFilterOperator, segmentIDs: Array<string> } | null };

export type SegmentPartsFragment = { __typename?: 'Segment', id: string, name?: string | null, resultOperator: BoolOperator, filters: Array<(
    { __typename?: 'Filter', byInFlightSegment?: { __typename?: 'Segment', id: string, name?: string | null, resultOperator: BoolOperator, filters: Array<(
        { __typename?: 'Filter' }
        & SegmentFilterPartsFragment
      )> } | null }
    & SegmentFilterPartsFragment
  )> };

export type TriggerPartsFragment = { __typename?: 'Trigger', id: string, enabled: boolean, conditionType: TriggerConditionType, delayValue: number, delayUnit: TriggerDelayUnit, attributeConditionErrors: Array<AttrFilterErrCode>, validationErrors: Array<TriggerValidationErrorCode>, attributeCondition?: { __typename?: 'AttrFilter', attribute: (
      { __typename?: 'BotAttribute' }
      & AttrNameFragment
    ), defaultStrategy?: { __typename?: 'AttrFilterDefaultStrategy', operator: AttrFilterDefaultOperator, comparableValues: Array<string> } | null, dateStrategy?: { __typename?: 'AttrFilterDateStrategy', operator: AttrFilterDateOperator, comparableDate?: string | null } | null } | null };

type WidgetBtn_WidgetCallPhoneButton_Fragment = { __typename: 'WidgetCallPhoneButton', id: string, phone: string, title: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) };

type WidgetBtn_WidgetContinueFlowButton_Fragment = { __typename: 'WidgetContinueFlowButton', id: string, title: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) };

type WidgetBtn_WidgetOpenUrlButton_Fragment = { __typename: 'WidgetOpenURLButton', id: string, title: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), url: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) };

export type WidgetBtnFragment = WidgetBtn_WidgetCallPhoneButton_Fragment | WidgetBtn_WidgetContinueFlowButton_Fragment | WidgetBtn_WidgetOpenUrlButton_Fragment;

type WaBtn_WhatsAppContinueFlowButton_Fragment = { __typename: 'WhatsAppContinueFlowButton', id: string, title: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) };

type WaBtn_WhatsAppOpenUrlButton_Fragment = { __typename: 'WhatsAppOpenURLButton', id: string, title: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), url: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) };

export type WaBtnFragment = WaBtn_WhatsAppContinueFlowButton_Fragment | WaBtn_WhatsAppOpenUrlButton_Fragment;

export type WaTplTextFragment = { __typename?: 'WhatsAppTemplateComponentText', text?: Array<{ __typename: 'WhatsAppTemplateComponentTextPartParam', name: string, value: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ) } | { __typename: 'WhatsAppTemplateComponentTextPartText', text?: string | null }> | null };

type ElementParts_AiAgentBlockElement_Fragment = (
  { __typename: 'AiAgentBlockElement', templateID: AiAgentTemplateId, maxTokens: number, availableTokens: number, id: string, platform: Platform, knowledgeItems: Array<{ __typename?: 'AiAgentKnowledgeItem', id: string, title: string, description: string, prompt: string }>, rules: Array<{ __typename?: 'AiAgentRule', id: string, title: string, prompt: string }> }
  & ElementErrors_AiAgentBlockElement_Fragment
);

type ElementParts_AiAgentCustomBlockElement_Fragment = (
  { __typename: 'AiAgentCustomBlockElement', maxTokens: number, availableTokens: number, prompt: string, id: string, platform: Platform, rules: Array<{ __typename?: 'AiAgentRule', id: string, title: string, prompt: string }> }
  & ElementErrors_AiAgentCustomBlockElement_Fragment
);

type ElementParts_ClearContactPropertyBlockElement_Fragment = (
  { __typename: 'ClearContactPropertyBlockElement', id: string, platform: Platform, attribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null }
  & ElementErrors_ClearContactPropertyBlockElement_Fragment
);

type ElementParts_DefaultReplyBlockElement_Fragment = (
  { __typename: 'DefaultReplyBlockElement', nextBlockHandleID: string, replyFrequency: DefaultReplyFrequency, id: string, platform: Platform }
  & ElementErrors_DefaultReplyBlockElement_Fragment
);

type ElementParts_FuelyAiAgentBlockElement_Fragment = (
  { __typename: 'FuelyAIAgentBlockElement', templateID: AiAgentTemplateId, additionalInstructions: string, charsCount: number, id: string, platform: Platform, rules: Array<{ __typename?: 'AiAgentRule', id: string, title: string, prompt: string }> }
  & ElementErrors_FuelyAiAgentBlockElement_Fragment
);

type ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'InstagramSwitchToChatWithHumanAgentBlockElement', id: string, platform: Platform }
  & ElementErrors_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
);

type ElementParts_RedirectToFlowBlockElement_Fragment = (
  { __typename: 'RedirectToFlowBlockElement', id: string, platform: Platform, flow?: { __typename?: 'DefaultReplyFlow', id: string, name: string } | { __typename?: 'RegularFlow', id: string, name: string } | null }
  & ElementErrors_RedirectToFlowBlockElement_Fragment
);

type ElementParts_SendJsonBlockElement_Fragment = (
  { __typename: 'SendJsonBlockElement', httpMethod: SendJsonHttpMethod, payloadType: SendJsonPayloadType, responseParsingRulesEnabled: boolean, id: string, platform: Platform, url: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), headers: Array<{ __typename?: 'SendJsonHeader', id: string, title: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ), value: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ) }>, customRequestPayload: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), encodedURLPayload: Array<{ __typename?: 'SendJsonURLParam', id: string, title: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ), value: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ) }>, responseParsingRules: Array<{ __typename?: 'SendJsonResponseParsingRule', id: string, jsonPath?: string | null, attribute?: (
      { __typename?: 'BotAttribute' }
      & AttrNameFragment
    ) | null }> }
  & ElementErrors_SendJsonBlockElement_Fragment
);

type ElementParts_SetConditionBlockElement_Fragment = (
  { __typename: 'SetConditionBlockElement', handleID: string, id: string, platform: Platform, segment: (
    { __typename?: 'Segment' }
    & SegmentPartsFragment
  ), segmentErrors: Array<{ __typename?: 'FilterValidationError', filterID?: string | null, code: FilterErrCode }> }
  & ElementErrors_SetConditionBlockElement_Fragment
);

type ElementParts_SetContactPropertyBlockElement_Fragment = (
  { __typename: 'SetContactPropertyBlockElement', value: string, id: string, platform: Platform, attribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null }
  & ElementErrors_SetContactPropertyBlockElement_Fragment
);

type ElementParts_SummarizeChatBlockElement_Fragment = (
  { __typename: 'SummarizeChatBlockElement', id: string, platform: Platform, entries: Array<{ __typename?: 'SummarizeChatEntry', id: string, description: string, attribute?: (
      { __typename?: 'BotAttribute' }
      & AttrNameFragment
    ) | null }> }
  & ElementErrors_SummarizeChatBlockElement_Fragment
);

type ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'TikTokSwitchToChatWithHumanAgentBlockElement', id: string, platform: Platform }
  & ElementErrors_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
);

type ElementParts_TriggeredMessageBlockElement_Fragment = (
  { __typename: 'TriggeredMessageBlockElement', handleID: string, id: string, platform: Platform, segment: (
    { __typename?: 'Segment' }
    & SegmentPartsFragment
  ), segmentErrors: Array<{ __typename?: 'FilterValidationError', filterID?: string | null, code: FilterErrCode }>, trigger: (
    { __typename?: 'Trigger' }
    & TriggerPartsFragment
  ) }
  & ElementErrors_TriggeredMessageBlockElement_Fragment
);

type ElementParts_WhatsAppAudioBlockElement_Fragment = (
  { __typename: 'WhatsAppAudioBlockElement', waitForReplies: boolean, saveContactReply: boolean, fileName: string, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, audio?: (
    { __typename?: 'File' }
    & FileRefFragment
  ) | null }
  & ElementErrors_WhatsAppAudioBlockElement_Fragment
);

type ElementParts_WhatsAppDocumentBlockElement_Fragment = (
  { __typename: 'WhatsAppDocumentBlockElement', waitForReplies: boolean, saveContactReply: boolean, fileName: string, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, document?: (
    { __typename?: 'File' }
    & FileRefFragment
  ) | null, caption: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) }
  & ElementErrors_WhatsAppDocumentBlockElement_Fragment
);

type ElementParts_WhatsAppImageBlockElement_Fragment = (
  { __typename: 'WhatsAppImageBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, image?: (
    { __typename?: 'File' }
    & FileRefFragment
  ) | null, caption: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) }
  & ElementErrors_WhatsAppImageBlockElement_Fragment
);

type ElementParts_WhatsAppListBlockElement_Fragment = (
  { __typename: 'WhatsAppListBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, bodyText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), buttonTitle: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), rows: Array<{ __typename?: 'WhatsAppListRow', id: string, title: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ), description: (
      { __typename?: 'TemplateStr' }
      & TStrFragment
    ) }> }
  & ElementErrors_WhatsAppListBlockElement_Fragment
);

type ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment = (
  { __typename: 'WhatsAppOneTimeNotificationBlockElement', status: BroadcastStatus, handleID: string, sentToContactsCount?: number | null, id: string, platform: Platform, segment: (
    { __typename?: 'Segment' }
    & SegmentPartsFragment
  ), segmentErrors: Array<{ __typename?: 'FilterValidationError', filterID?: string | null, code: FilterErrCode }> }
  & ElementErrors_WhatsAppOneTimeNotificationBlockElement_Fragment
);

type ElementParts_WhatsAppScheduledMessageBlockElement_Fragment = (
  { __typename: 'WhatsAppScheduledMessageBlockElement', handleID: string, status: BroadcastStatus, firstSendTime: string, repeatType: BroadcastRepeatType, repeatOnWeekdays: Array<Weekday>, repeatEveryNDays?: number | null, repeatOnCertainDates: Array<string>, id: string, platform: Platform, segment: (
    { __typename?: 'Segment' }
    & SegmentPartsFragment
  ), segmentErrors: Array<{ __typename?: 'FilterValidationError', filterID?: string | null, code: FilterErrCode }> }
  & ElementErrors_WhatsAppScheduledMessageBlockElement_Fragment
);

type ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'WhatsAppSwitchToChatWithHumanAgentBlockElement', id: string, platform: Platform }
  & ElementErrors_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
);

type ElementParts_WhatsAppTemplateBlockElement_Fragment = (
  { __typename: 'WhatsAppTemplateBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, whatsAppTemplate?: { __typename?: 'WhatsAppTemplateConfig', templateID: string, name: string, status: WhatsAppTemplateStatus, header?: { __typename: 'WhatsAppTemplateComponentDocument', fileName?: string | null, document?: (
        { __typename?: 'File' }
        & FileRefFragment
      ) | null } | { __typename: 'WhatsAppTemplateComponentImage', image?: (
        { __typename?: 'File' }
        & FileRefFragment
      ) | null } | (
      { __typename: 'WhatsAppTemplateComponentText' }
      & WaTplTextFragment
    ) | { __typename: 'WhatsAppTemplateComponentVideo', video?: (
        { __typename?: 'File' }
        & FileRefFragment
      ) | null } | null, body: (
      { __typename?: 'WhatsAppTemplateComponentText' }
      & WaTplTextFragment
    ), footer?: (
      { __typename?: 'WhatsAppTemplateComponentText' }
      & WaTplTextFragment
    ) | null, buttons: Array<{ __typename: 'WhatsAppTemplateCallPhoneButton', text: string, phoneNumber: string } | { __typename: 'WhatsAppTemplateCopyCodeButton', id: string, text: string, code: (
        { __typename?: 'TemplateStr' }
        & TStrFragment
      ) } | { __typename: 'WhatsAppTemplateQuickReplyButton', id: string, text: string } | { __typename: 'WhatsAppTemplateURLButton', id: string, text: string, url?: Array<{ __typename: 'WhatsAppTemplateComponentTextPartParam', name: string, value: (
          { __typename?: 'TemplateStr' }
          & TStrFragment
        ) } | { __typename: 'WhatsAppTemplateComponentTextPartText', text?: string | null }> | null } | { __typename: 'WhatsAppTemplateWhatsAppCallButton', text: string }> } | null }
  & ElementErrors_WhatsAppTemplateBlockElement_Fragment
);

type ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment = (
  { __typename: 'WhatsAppTextAndButtonsBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, headerText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), bodyText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), footerText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), buttons: Array<(
    { __typename?: 'WhatsAppContinueFlowButton' }
    & WaBtn_WhatsAppContinueFlowButton_Fragment
  ) | (
    { __typename?: 'WhatsAppOpenURLButton' }
    & WaBtn_WhatsAppOpenUrlButton_Fragment
  )> }
  & ElementErrors_WhatsAppTextAndButtonsBlockElement_Fragment
);

type ElementParts_WhatsAppTextAndUrlBlockElement_Fragment = (
  { __typename: 'WhatsAppTextAndURLBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, headerText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), bodyText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), footerText: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), buttons: Array<(
    { __typename?: 'WhatsAppContinueFlowButton' }
    & WaBtn_WhatsAppContinueFlowButton_Fragment
  ) | (
    { __typename?: 'WhatsAppOpenURLButton' }
    & WaBtn_WhatsAppOpenUrlButton_Fragment
  )> }
  & ElementErrors_WhatsAppTextAndUrlBlockElement_Fragment
);

type ElementParts_WhatsAppTextBlockElement_Fragment = (
  { __typename: 'WhatsAppTextBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, text: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) }
  & ElementErrors_WhatsAppTextBlockElement_Fragment
);

type ElementParts_WhatsAppVideoBlockElement_Fragment = (
  { __typename: 'WhatsAppVideoBlockElement', waitForReplies: boolean, saveContactReply: boolean, fileName: string, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, video?: (
    { __typename?: 'File' }
    & FileRefFragment
  ) | null, caption: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ) }
  & ElementErrors_WhatsAppVideoBlockElement_Fragment
);

type ElementParts_WidgetEntryPointBlockElement_Fragment = (
  { __typename: 'WidgetEntryPointBlockElement', nextBlockHandleID: string, id: string, platform: Platform }
  & ElementErrors_WidgetEntryPointBlockElement_Fragment
);

type ElementParts_WidgetImageBlockElement_Fragment = (
  { __typename: 'WidgetImageBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, image?: (
    { __typename?: 'File' }
    & FileRefFragment
  ) | null }
  & ElementErrors_WidgetImageBlockElement_Fragment
);

type ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'WidgetSwitchToChatWithHumanAgentBlockElement', id: string, platform: Platform }
  & ElementErrors_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
);

type ElementParts_WidgetTextAndButtonBlockElement_Fragment = (
  { __typename: 'WidgetTextAndButtonBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, platform: Platform, savingToAttribute?: (
    { __typename?: 'BotAttribute' }
    & AttrNameFragment
  ) | null, text: (
    { __typename?: 'TemplateStr' }
    & TStrFragment
  ), buttons: Array<(
    { __typename?: 'WidgetCallPhoneButton' }
    & WidgetBtn_WidgetCallPhoneButton_Fragment
  ) | (
    { __typename?: 'WidgetContinueFlowButton' }
    & WidgetBtn_WidgetContinueFlowButton_Fragment
  ) | (
    { __typename?: 'WidgetOpenURLButton' }
    & WidgetBtn_WidgetOpenUrlButton_Fragment
  )> }
  & ElementErrors_WidgetTextAndButtonBlockElement_Fragment
);

export type ElementPartsFragment = ElementParts_AiAgentBlockElement_Fragment | ElementParts_AiAgentCustomBlockElement_Fragment | ElementParts_ClearContactPropertyBlockElement_Fragment | ElementParts_DefaultReplyBlockElement_Fragment | ElementParts_FuelyAiAgentBlockElement_Fragment | ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment | ElementParts_RedirectToFlowBlockElement_Fragment | ElementParts_SendJsonBlockElement_Fragment | ElementParts_SetConditionBlockElement_Fragment | ElementParts_SetContactPropertyBlockElement_Fragment | ElementParts_SummarizeChatBlockElement_Fragment | ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment | ElementParts_TriggeredMessageBlockElement_Fragment | ElementParts_WhatsAppAudioBlockElement_Fragment | ElementParts_WhatsAppDocumentBlockElement_Fragment | ElementParts_WhatsAppImageBlockElement_Fragment | ElementParts_WhatsAppListBlockElement_Fragment | ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment | ElementParts_WhatsAppScheduledMessageBlockElement_Fragment | ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment | ElementParts_WhatsAppTemplateBlockElement_Fragment | ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment | ElementParts_WhatsAppTextAndUrlBlockElement_Fragment | ElementParts_WhatsAppTextBlockElement_Fragment | ElementParts_WhatsAppVideoBlockElement_Fragment | ElementParts_WidgetEntryPointBlockElement_Fragment | ElementParts_WidgetImageBlockElement_Fragment | ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment | ElementParts_WidgetTextAndButtonBlockElement_Fragment;

type BlockParts_AiAgentBlock_Fragment = { __typename: 'AiAgentBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_ClearContactPropertyBlock_Fragment = { __typename: 'ClearContactPropertyBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_DefaultReplyBlock_Fragment = { __typename: 'DefaultReplyBlock', showToggle: boolean, isEntryPointEnabled: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_RedirectToFlowBlock_Fragment = { __typename: 'RedirectToFlowBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_RegularActionBlock_Fragment = { __typename: 'RegularActionBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_RegularContentBlock_Fragment = { __typename: 'RegularContentBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_SetConditionBlock_Fragment = { __typename: 'SetConditionBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_SetContactPropertyBlock_Fragment = { __typename: 'SetContactPropertyBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_TriggeredMessageBlock_Fragment = { __typename: 'TriggeredMessageBlock', showToggle: boolean, isEntryPointEnabled: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WhatsAppListBlock_Fragment = { __typename: 'WhatsAppListBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WhatsAppOneTimeNotificationBlock_Fragment = { __typename: 'WhatsAppOneTimeNotificationBlock', showToggle: boolean, isEntryPointEnabled: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WhatsAppScheduledMessageBlock_Fragment = { __typename: 'WhatsAppScheduledMessageBlock', showToggle: boolean, isEntryPointEnabled: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WhatsAppTemplateBlock_Fragment = { __typename: 'WhatsAppTemplateBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WhatsAppTextAndButtonsBlock_Fragment = { __typename: 'WhatsAppTextAndButtonsBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WhatsAppTextAndUrlBlock_Fragment = { __typename: 'WhatsAppTextAndURLBlock', isStartingPoint: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BlockParts_WidgetEntryPointBlock_Fragment = { __typename: 'WidgetEntryPointBlock', showToggle: boolean, isEntryPointEnabled: boolean, id: string, name: string, positionX: number, positionY: number, platform: Platform, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & ElementParts_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & ElementParts_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & ElementParts_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & ElementParts_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & ElementParts_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & ElementParts_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & ElementParts_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & ElementParts_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & ElementParts_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & ElementParts_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & ElementParts_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & ElementParts_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & ElementParts_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & ElementParts_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & ElementParts_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & ElementParts_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & ElementParts_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & ElementParts_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & ElementParts_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & ElementParts_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & ElementParts_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & ElementParts_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & ElementParts_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & ElementParts_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & ElementParts_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & ElementParts_WidgetTextAndButtonBlockElement_Fragment
  )> };

export type BlockPartsFragment = BlockParts_AiAgentBlock_Fragment | BlockParts_ClearContactPropertyBlock_Fragment | BlockParts_DefaultReplyBlock_Fragment | BlockParts_RedirectToFlowBlock_Fragment | BlockParts_RegularActionBlock_Fragment | BlockParts_RegularContentBlock_Fragment | BlockParts_SetConditionBlock_Fragment | BlockParts_SetContactPropertyBlock_Fragment | BlockParts_TriggeredMessageBlock_Fragment | BlockParts_WhatsAppListBlock_Fragment | BlockParts_WhatsAppOneTimeNotificationBlock_Fragment | BlockParts_WhatsAppScheduledMessageBlock_Fragment | BlockParts_WhatsAppTemplateBlock_Fragment | BlockParts_WhatsAppTextAndButtonsBlock_Fragment | BlockParts_WhatsAppTextAndUrlBlock_Fragment | BlockParts_WidgetEntryPointBlock_Fragment;

type ConnectionParts_BlockToBlockConnection_Fragment = { __typename: 'BlockToBlockConnection', id: string, sourceBlockID: string, targetBlockID: string };

type ConnectionParts_ComponentToBlockConnection_Fragment = { __typename: 'ComponentToBlockConnection', id: string, sourceBlockID: string, sourceBlockElementID: string, sourceHandleID: string, targetBlockID: string };

export type ConnectionPartsFragment = ConnectionParts_BlockToBlockConnection_Fragment | ConnectionParts_ComponentToBlockConnection_Fragment;

type FlowParts_DefaultReplyFlow_Fragment = { __typename: 'DefaultReplyFlow', id: string, name: string, platform: Platform, startingPointBlock?: { __typename?: 'AiAgentBlock', id: string } | { __typename?: 'ClearContactPropertyBlock', id: string } | { __typename?: 'DefaultReplyBlock', id: string } | { __typename?: 'RedirectToFlowBlock', id: string } | { __typename?: 'RegularActionBlock', id: string } | { __typename?: 'RegularContentBlock', id: string } | { __typename?: 'SetConditionBlock', id: string } | { __typename?: 'SetContactPropertyBlock', id: string } | { __typename?: 'TriggeredMessageBlock', id: string } | { __typename?: 'WhatsAppListBlock', id: string } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string } | { __typename?: 'WhatsAppTemplateBlock', id: string } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string } | { __typename?: 'WhatsAppTextAndURLBlock', id: string } | { __typename?: 'WidgetEntryPointBlock', id: string } | null, entryPoints: Array<{ __typename: 'DefaultReplyBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'TriggeredMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppOneTimeNotificationBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppScheduledMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'WidgetEntryPointBlock', id: string, name: string, isEntryPointEnabled: boolean }>, blocks: Array<(
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlock' }
    & BlockParts_DefaultReplyBlock_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlock' }
    & BlockParts_RedirectToFlowBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlock' }
    & BlockParts_TriggeredMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BlockParts_WhatsAppOneTimeNotificationBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlock' }
    & BlockParts_WidgetEntryPointBlock_Fragment
  )>, connections: Array<(
    { __typename?: 'BlockToBlockConnection' }
    & ConnectionParts_BlockToBlockConnection_Fragment
  ) | (
    { __typename?: 'ComponentToBlockConnection' }
    & ConnectionParts_ComponentToBlockConnection_Fragment
  )> };

type FlowParts_RegularFlow_Fragment = { __typename: 'RegularFlow', id: string, name: string, platform: Platform, startingPointBlock?: { __typename?: 'AiAgentBlock', id: string } | { __typename?: 'ClearContactPropertyBlock', id: string } | { __typename?: 'DefaultReplyBlock', id: string } | { __typename?: 'RedirectToFlowBlock', id: string } | { __typename?: 'RegularActionBlock', id: string } | { __typename?: 'RegularContentBlock', id: string } | { __typename?: 'SetConditionBlock', id: string } | { __typename?: 'SetContactPropertyBlock', id: string } | { __typename?: 'TriggeredMessageBlock', id: string } | { __typename?: 'WhatsAppListBlock', id: string } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string } | { __typename?: 'WhatsAppTemplateBlock', id: string } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string } | { __typename?: 'WhatsAppTextAndURLBlock', id: string } | { __typename?: 'WidgetEntryPointBlock', id: string } | null, entryPoints: Array<{ __typename: 'DefaultReplyBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'TriggeredMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppOneTimeNotificationBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppScheduledMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename: 'WidgetEntryPointBlock', id: string, name: string, isEntryPointEnabled: boolean }>, blocks: Array<(
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlock' }
    & BlockParts_DefaultReplyBlock_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlock' }
    & BlockParts_RedirectToFlowBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlock' }
    & BlockParts_TriggeredMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BlockParts_WhatsAppOneTimeNotificationBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlock' }
    & BlockParts_WidgetEntryPointBlock_Fragment
  )>, connections: Array<(
    { __typename?: 'BlockToBlockConnection' }
    & ConnectionParts_BlockToBlockConnection_Fragment
  ) | (
    { __typename?: 'ComponentToBlockConnection' }
    & ConnectionParts_ComponentToBlockConnection_Fragment
  )> };

export type FlowPartsFragment = FlowParts_DefaultReplyFlow_Fragment | FlowParts_RegularFlow_Fragment;

type FlowListItem_DefaultReplyFlow_Fragment = { __typename: 'DefaultReplyFlow', id: string, name: string, platform: Platform, entryPoints: Array<{ __typename?: 'DefaultReplyBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'TriggeredMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'WidgetEntryPointBlock', id: string, name: string, isEntryPointEnabled: boolean }> };

type FlowListItem_RegularFlow_Fragment = { __typename: 'RegularFlow', id: string, name: string, platform: Platform, entryPoints: Array<{ __typename?: 'DefaultReplyBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'TriggeredMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, name: string, isEntryPointEnabled: boolean } | { __typename?: 'WidgetEntryPointBlock', id: string, name: string, isEntryPointEnabled: boolean }> };

export type FlowListItemFragment = FlowListItem_DefaultReplyFlow_Fragment | FlowListItem_RegularFlow_Fragment;

export type FlowsListQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type FlowsListQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, name: string, flows: Array<(
        { __typename?: 'RegularFlow' }
        & FlowListItem_RegularFlow_Fragment
      )> }>, flowsWithoutGroup: Array<(
      { __typename?: 'RegularFlow' }
      & FlowListItem_RegularFlow_Fragment
    )>, defaultReplyFlows: Array<(
      { __typename?: 'DefaultReplyFlow' }
      & FlowListItem_DefaultReplyFlow_Fragment
    )> } };

export type FlowStructureQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  flowID: Scalars['FlowID']['input'];
}>;


export type FlowStructureQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, flow: (
      { __typename?: 'DefaultReplyFlow', inboundLinks: Array<{ __typename: 'FlowToFlowInboundLink', id: string, redirects: number, flow: { __typename?: 'DefaultReplyFlow', id: string, name: string } | { __typename?: 'RegularFlow', id: string, name: string }, block: { __typename?: 'AiAgentBlock', id: string, name: string } | { __typename?: 'ClearContactPropertyBlock', id: string, name: string } | { __typename?: 'DefaultReplyBlock', id: string, name: string } | { __typename?: 'RedirectToFlowBlock', id: string, name: string } | { __typename?: 'RegularActionBlock', id: string, name: string } | { __typename?: 'RegularContentBlock', id: string, name: string } | { __typename?: 'SetConditionBlock', id: string, name: string } | { __typename?: 'SetContactPropertyBlock', id: string, name: string } | { __typename?: 'TriggeredMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppListBlock', id: string, name: string } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, name: string } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppTemplateBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, name: string } | { __typename?: 'WidgetEntryPointBlock', id: string, name: string } } | { __typename: 'KeywordGroupToFlowInboundLink', id: string, redirects: number }> }
      & FlowParts_DefaultReplyFlow_Fragment
    ) | (
      { __typename?: 'RegularFlow', inboundLinks: Array<{ __typename: 'FlowToFlowInboundLink', id: string, redirects: number, flow: { __typename?: 'DefaultReplyFlow', id: string, name: string } | { __typename?: 'RegularFlow', id: string, name: string }, block: { __typename?: 'AiAgentBlock', id: string, name: string } | { __typename?: 'ClearContactPropertyBlock', id: string, name: string } | { __typename?: 'DefaultReplyBlock', id: string, name: string } | { __typename?: 'RedirectToFlowBlock', id: string, name: string } | { __typename?: 'RegularActionBlock', id: string, name: string } | { __typename?: 'RegularContentBlock', id: string, name: string } | { __typename?: 'SetConditionBlock', id: string, name: string } | { __typename?: 'SetContactPropertyBlock', id: string, name: string } | { __typename?: 'TriggeredMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppListBlock', id: string, name: string } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, name: string } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppTemplateBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, name: string } | { __typename?: 'WidgetEntryPointBlock', id: string, name: string } } | { __typename: 'KeywordGroupToFlowInboundLink', id: string, redirects: number }> }
      & FlowParts_RegularFlow_Fragment
    ) } };

export type BotAttributesAutocompleteQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  locale: DashboardLocale;
  platforms: Array<Platform> | Platform;
  attributeTypes: Array<AttributeType> | AttributeType;
  inputSubstring?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['BotAttributeCursor']['input']>;
}>;


export type BotAttributesAutocompleteQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, botAttributes: { __typename?: 'BotAttributeConnection', edges: Array<{ __typename?: 'BotAttributeEdge', cursor: string, node: { __typename?: 'BotAttributeNode', usersCount?: number | null, defaultValue?: string | null, flowsCount: number, botAttribute: (
            { __typename?: 'BotAttribute', aliases: Array<{ __typename?: 'AttributeLocalizedAlias', locale: DashboardLocale, alias: string }> }
            & AttrNameFragment
          ) } }>, pageInfo: { __typename?: 'BotAttributePageInfo', hasNextPage: boolean, endCursor?: string | null } } } };

export type AiAgentTemplatesCatalogQueryVariables = Exact<{
  locale: DashboardLocale;
}>;


export type AiAgentTemplatesCatalogQuery = { __typename?: 'Query', aiAgentTemplates: Array<{ __typename?: 'AiAgentTemplate', id: AiAgentTemplateId, title: string, description: string }> };

export type CreateFlowMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  platform: Platform;
}>;


export type CreateFlowMutation = { __typename?: 'Mutation', createFlow: { __typename?: 'Bot', id: string, flowsWithoutGroup: Array<(
      { __typename?: 'RegularFlow' }
      & FlowListItem_RegularFlow_Fragment
    )> } };

export type RenameFlowMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  name: Scalars['String']['input'];
}>;


export type RenameFlowMutation = { __typename?: 'Mutation', updateFlowName: { __typename?: 'DefaultReplyFlow', id: string, name: string } | { __typename?: 'RegularFlow', id: string, name: string } };

export type DeleteFlowMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
}>;


export type DeleteFlowMutation = { __typename?: 'Mutation', deleteFlow: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, flows: Array<{ __typename?: 'RegularFlow', id: string }> }>, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type CreateFlowGroupMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type CreateFlowGroupMutation = { __typename?: 'Mutation', createFlowGroup: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, name: string }> } };

export type RenameFlowGroupMutationVariables = Exact<{
  groupID: Scalars['FlowGroupID']['input'];
  name: Scalars['String']['input'];
}>;


export type RenameFlowGroupMutation = { __typename?: 'Mutation', updateFlowGroupName: { __typename?: 'FlowGroup', id: string, name: string } };

export type DeleteFlowGroupMutationVariables = Exact<{
  groupID: Scalars['FlowGroupID']['input'];
}>;


export type DeleteFlowGroupMutation = { __typename?: 'Mutation', deleteFlowGroup: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string }>, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type MoveFlowToGroupMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  groupID: Scalars['FlowGroupID']['input'];
}>;


export type MoveFlowToGroupMutation = { __typename?: 'Mutation', moveFlowToGroup: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, flows: Array<{ __typename?: 'RegularFlow', id: string }> }>, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type RemoveFlowFromGroupMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
}>;


export type RemoveFlowFromGroupMutation = { __typename?: 'Mutation', removeFlowFromGroup: { __typename?: 'Bot', id: string, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type SortFlowGroupsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  flowGroupIDs: Array<Scalars['FlowGroupID']['input']> | Scalars['FlowGroupID']['input'];
}>;


export type SortFlowGroupsMutation = { __typename?: 'Mutation', sortFlowGroups: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string }> } };

export type SortFlowsInGroupMutationVariables = Exact<{
  groupID: Scalars['FlowGroupID']['input'];
  flowIDs: Array<Scalars['FlowID']['input']> | Scalars['FlowID']['input'];
}>;


export type SortFlowsInGroupMutation = { __typename?: 'Mutation', sortFlowsInGroup: { __typename?: 'FlowGroup', id: string, flows: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type SortUngroupedFlowsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  flowIDs: Array<Scalars['FlowID']['input']> | Scalars['FlowID']['input'];
}>;


export type SortUngroupedFlowsMutation = { __typename?: 'Mutation', sortUngroupedFlows: { __typename?: 'Bot', id: string, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type MoveBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type MoveBlockMutation = { __typename?: 'Mutation', updateBlockPosition: { __typename?: 'AiAgentBlock', id: string, positionX: number, positionY: number } | { __typename?: 'ClearContactPropertyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'DefaultReplyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RedirectToFlowBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RegularActionBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RegularContentBlock', id: string, positionX: number, positionY: number } | { __typename?: 'SetConditionBlock', id: string, positionX: number, positionY: number } | { __typename?: 'SetContactPropertyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'TriggeredMessageBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppListBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTemplateBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WidgetEntryPointBlock', id: string, positionX: number, positionY: number } };

export type MoveBlocksBulkMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  update: Array<BlockPositionBulkUpdate> | BlockPositionBulkUpdate;
}>;


export type MoveBlocksBulkMutation = { __typename?: 'Mutation', updateBlockPositionBulk: { __typename?: 'DefaultReplyFlow', id: string, blocks: Array<{ __typename?: 'AiAgentBlock', id: string, positionX: number, positionY: number } | { __typename?: 'ClearContactPropertyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'DefaultReplyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RedirectToFlowBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RegularActionBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RegularContentBlock', id: string, positionX: number, positionY: number } | { __typename?: 'SetConditionBlock', id: string, positionX: number, positionY: number } | { __typename?: 'SetContactPropertyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'TriggeredMessageBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppListBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTemplateBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WidgetEntryPointBlock', id: string, positionX: number, positionY: number }> } | { __typename?: 'RegularFlow', id: string, blocks: Array<{ __typename?: 'AiAgentBlock', id: string, positionX: number, positionY: number } | { __typename?: 'ClearContactPropertyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'DefaultReplyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RedirectToFlowBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RegularActionBlock', id: string, positionX: number, positionY: number } | { __typename?: 'RegularContentBlock', id: string, positionX: number, positionY: number } | { __typename?: 'SetConditionBlock', id: string, positionX: number, positionY: number } | { __typename?: 'SetContactPropertyBlock', id: string, positionX: number, positionY: number } | { __typename?: 'TriggeredMessageBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppListBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTemplateBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, positionX: number, positionY: number } | { __typename?: 'WidgetEntryPointBlock', id: string, positionX: number, positionY: number }> } };

export type RenameBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
  name: Scalars['String']['input'];
}>;


export type RenameBlockMutation = { __typename?: 'Mutation', updateBlockName: { __typename?: 'AiAgentBlock', id: string, name: string } | { __typename?: 'ClearContactPropertyBlock', id: string, name: string } | { __typename?: 'DefaultReplyBlock', id: string, name: string } | { __typename?: 'RedirectToFlowBlock', id: string, name: string } | { __typename?: 'RegularActionBlock', id: string, name: string } | { __typename?: 'RegularContentBlock', id: string, name: string } | { __typename?: 'SetConditionBlock', id: string, name: string } | { __typename?: 'SetContactPropertyBlock', id: string, name: string } | { __typename?: 'TriggeredMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppListBlock', id: string, name: string } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, name: string } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppTemplateBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, name: string } | { __typename?: 'WidgetEntryPointBlock', id: string, name: string } };

export type DeleteBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type DeleteBlockMutation = { __typename?: 'Mutation', deleteBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type SetStartingPointMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type SetStartingPointMutation = { __typename?: 'Mutation', blockSetStartingPoint: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type EnableEntryPointMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type EnableEntryPointMutation = { __typename?: 'Mutation', blockEnableEntryPoint: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type DisableEntryPointMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type DisableEntryPointMutation = { __typename?: 'Mutation', blockDisableEntryPoint: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type DeleteElementMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  elementID: Scalars['BlockElementID']['input'];
}>;


export type DeleteElementMutation = { __typename?: 'Mutation', blockElementDelete: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type SortElementsMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
  elementIDs: Array<Scalars['BlockElementID']['input']> | Scalars['BlockElementID']['input'];
}>;


export type SortElementsMutation = { __typename?: 'Mutation', sortBlockElements: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlock' }
    & BlockParts_DefaultReplyBlock_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlock' }
    & BlockParts_RedirectToFlowBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlock' }
    & BlockParts_TriggeredMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BlockParts_WhatsAppOneTimeNotificationBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlock' }
    & BlockParts_WidgetEntryPointBlock_Fragment
  ) };

export type AddWidgetTextAndButtonsToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWidgetTextAndButtonsToBlockMutation = { __typename?: 'Mutation', widgetTextAndButtonsCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWidgetImageToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWidgetImageToBlockMutation = { __typename?: 'Mutation', widgetImageCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWhatsAppImageToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWhatsAppImageToBlockMutation = { __typename?: 'Mutation', whatsAppImageCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWhatsAppVideoToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWhatsAppVideoToBlockMutation = { __typename?: 'Mutation', whatsAppVideoCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWhatsAppAudioToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWhatsAppAudioToBlockMutation = { __typename?: 'Mutation', whatsAppAudioCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWhatsAppDocumentToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWhatsAppDocumentToBlockMutation = { __typename?: 'Mutation', whatsAppDocumentCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddSetConditionToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddSetConditionToBlockMutation = { __typename?: 'Mutation', setConditionCreateInBlock: (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) };

export type AddSetContactPropertyToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddSetContactPropertyToBlockMutation = { __typename?: 'Mutation', setContactPropertyCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddClearContactPropertyToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddClearContactPropertyToBlockMutation = { __typename?: 'Mutation', clearContactPropertyCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddSendJsonToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddSendJsonToBlockMutation = { __typename?: 'Mutation', sendJsonCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddSummarizeChatToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddSummarizeChatToBlockMutation = { __typename?: 'Mutation', summarizeChatCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddWidgetSwitchToHumanToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWidgetSwitchToHumanToBlockMutation = { __typename?: 'Mutation', widgetSwitchToChatWithHumanAgentCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddWhatsAppSwitchToHumanToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWhatsAppSwitchToHumanToBlockMutation = { __typename?: 'Mutation', whatsAppSwitchToChatWithHumanAgentCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddInstagramSwitchToHumanToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddInstagramSwitchToHumanToBlockMutation = { __typename?: 'Mutation', instagramSwitchToChatWithHumanAgentCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddTikTokSwitchToHumanToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddTikTokSwitchToHumanToBlockMutation = { __typename?: 'Mutation', tiktokSwitchToChatWithHumanAgentCreateInBlock: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type ConnectBlocksMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: BlockToBlockConnectionCreateRequest;
}>;


export type ConnectBlocksMutation = { __typename?: 'Mutation', blockToBlockConnectionCreateOrUpdate: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type ConnectComponentMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: ComponentToBlockConnectionCreateRequest;
}>;


export type ConnectComponentMutation = { __typename?: 'Mutation', componentToBlockConnectionCreateOrUpdate: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type DisconnectBlocksMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  sourceBlockID: Scalars['BlockID']['input'];
}>;


export type DisconnectBlocksMutation = { __typename?: 'Mutation', blockToBlockConnectionDelete: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type DisconnectComponentMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  sourceBlockElementID: Scalars['BlockElementID']['input'];
  sourceHandleID: Scalars['ComponentHandleID']['input'];
}>;


export type DisconnectComponentMutation = { __typename?: 'Mutation', componentToBlockConnectionDelete: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTextBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTextBlockMutation = { __typename?: 'Mutation', whatsAppTextCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTextBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTextBlockConnectedMutation = { __typename?: 'Mutation', whatsAppTextCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type AddWhatsAppTextToBlockMutationVariables = Exact<{
  blockID: Scalars['BlockID']['input'];
}>;


export type AddWhatsAppTextToBlockMutation = { __typename?: 'Mutation', whatsAppTextCreateInBlock: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type CreateWidgetTextAndButtonsBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetTextAndButtonsBlockMutation = { __typename?: 'Mutation', widgetTextAndButtonsCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type CreateWidgetEntryPointMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetEntryPointMutation = { __typename?: 'Mutation', widgetEPCreate: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

export type CreateAiAgentBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
  templateID: AiAgentTemplateId;
}>;


export type CreateAiAgentBlockMutation = { __typename?: 'Mutation', aiAgentCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowParts_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowParts_RegularFlow_Fragment
  ) };

type FlowBlocksSlim_DefaultReplyFlow_Fragment = { __typename?: 'DefaultReplyFlow', id: string, blocks: Array<{ __typename: 'AiAgentBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'ClearContactPropertyBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'DefaultReplyBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'RedirectToFlowBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'RegularActionBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'RegularContentBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'SetConditionBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'SetContactPropertyBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'TriggeredMessageBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppListBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppOneTimeNotificationBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppScheduledMessageBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppTemplateBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppTextAndButtonsBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppTextAndURLBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WidgetEntryPointBlock', id: string, name: string, positionX: number, positionY: number }> };

type FlowBlocksSlim_RegularFlow_Fragment = { __typename?: 'RegularFlow', id: string, blocks: Array<{ __typename: 'AiAgentBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'ClearContactPropertyBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'DefaultReplyBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'RedirectToFlowBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'RegularActionBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'RegularContentBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'SetConditionBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'SetContactPropertyBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'TriggeredMessageBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppListBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppOneTimeNotificationBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppScheduledMessageBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppTemplateBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppTextAndButtonsBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WhatsAppTextAndURLBlock', id: string, name: string, positionX: number, positionY: number } | { __typename: 'WidgetEntryPointBlock', id: string, name: string, positionX: number, positionY: number }> };

export type FlowBlocksSlimFragment = FlowBlocksSlim_DefaultReplyFlow_Fragment | FlowBlocksSlim_RegularFlow_Fragment;

export type CreateWidgetImageBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetImageBlockMutation = { __typename?: 'Mutation', widgetImageCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWidgetSwitchToHumanBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetSwitchToHumanBlockMutation = { __typename?: 'Mutation', widgetSwitchToChatWithHumanAgentCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppImageBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppImageBlockMutation = { __typename?: 'Mutation', whatsAppImageCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppVideoBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppVideoBlockMutation = { __typename?: 'Mutation', whatsAppVideoCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppAudioBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppAudioBlockMutation = { __typename?: 'Mutation', whatsAppAudioCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppDocumentBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppDocumentBlockMutation = { __typename?: 'Mutation', whatsAppDocumentCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTextAndButtonsBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTextAndButtonsBlockMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTextAndUrlBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTextAndUrlBlockMutation = { __typename?: 'Mutation', whatsAppTextAndURLCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppListBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppListBlockMutation = { __typename?: 'Mutation', whatsAppListCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTemplateBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTemplateBlockMutation = { __typename?: 'Mutation', whatsAppTemplateCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppSwitchToHumanBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppSwitchToHumanBlockMutation = { __typename?: 'Mutation', whatsAppSwitchToChatWithHumanAgentCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateInstagramSwitchToHumanBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateInstagramSwitchToHumanBlockMutation = { __typename?: 'Mutation', instagramSwitchToChatWithHumanAgentCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateTikTokSwitchToHumanBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateTikTokSwitchToHumanBlockMutation = { __typename?: 'Mutation', tiktokSwitchToChatWithHumanAgentCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSetConditionBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSetConditionBlockMutation = { __typename?: 'Mutation', setConditionCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSetContactPropertyBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSetContactPropertyBlockMutation = { __typename?: 'Mutation', setContactPropertyCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateClearContactPropertyBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateClearContactPropertyBlockMutation = { __typename?: 'Mutation', clearContactPropertyCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSendJsonBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSendJsonBlockMutation = { __typename?: 'Mutation', sendJsonCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSummarizeChatBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSummarizeChatBlockMutation = { __typename?: 'Mutation', summarizeChatCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateRedirectToFlowBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateRedirectToFlowBlockMutation = { __typename?: 'Mutation', redirectToFlowCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateTriggeredMessageBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateTriggeredMessageBlockMutation = { __typename?: 'Mutation', triggeredMessageCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppOneTimeNotificationBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppOneTimeNotificationBlockMutation = { __typename?: 'Mutation', whatsAppOneTimeNotificationCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppScheduledMessageBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppScheduledMessageBlockMutation = { __typename?: 'Mutation', whatsAppScheduledMessageCreateWithBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWidgetTextAndButtonsBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetTextAndButtonsBlockConnectedMutation = { __typename?: 'Mutation', widgetTextAndButtonsCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWidgetImageBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetImageBlockConnectedMutation = { __typename?: 'Mutation', widgetImageCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWidgetSwitchToHumanBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWidgetSwitchToHumanBlockConnectedMutation = { __typename?: 'Mutation', widgetSwitchToChatWithHumanAgentCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppImageBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppImageBlockConnectedMutation = { __typename?: 'Mutation', whatsAppImageCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppVideoBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppVideoBlockConnectedMutation = { __typename?: 'Mutation', whatsAppVideoCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppAudioBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppAudioBlockConnectedMutation = { __typename?: 'Mutation', whatsAppAudioCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppDocumentBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppDocumentBlockConnectedMutation = { __typename?: 'Mutation', whatsAppDocumentCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTextAndButtonsBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTextAndButtonsBlockConnectedMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTextAndUrlBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTextAndUrlBlockConnectedMutation = { __typename?: 'Mutation', whatsAppTextAndURLCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppListBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppListBlockConnectedMutation = { __typename?: 'Mutation', whatsAppListCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppTemplateBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppTemplateBlockConnectedMutation = { __typename?: 'Mutation', whatsAppTemplateCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateWhatsAppSwitchToHumanBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateWhatsAppSwitchToHumanBlockConnectedMutation = { __typename?: 'Mutation', whatsAppSwitchToChatWithHumanAgentCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateInstagramSwitchToHumanBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateInstagramSwitchToHumanBlockConnectedMutation = { __typename?: 'Mutation', instagramSwitchToChatWithHumanAgentCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateTikTokSwitchToHumanBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateTikTokSwitchToHumanBlockConnectedMutation = { __typename?: 'Mutation', tiktokSwitchToChatWithHumanAgentCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSetConditionBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSetConditionBlockConnectedMutation = { __typename?: 'Mutation', setConditionCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSetContactPropertyBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSetContactPropertyBlockConnectedMutation = { __typename?: 'Mutation', setContactPropertyCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateClearContactPropertyBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateClearContactPropertyBlockConnectedMutation = { __typename?: 'Mutation', clearContactPropertyCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSendJsonBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSendJsonBlockConnectedMutation = { __typename?: 'Mutation', sendJsonCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateSummarizeChatBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateSummarizeChatBlockConnectedMutation = { __typename?: 'Mutation', summarizeChatCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateRedirectToFlowBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
}>;


export type CreateRedirectToFlowBlockConnectedMutation = { __typename?: 'Mutation', redirectToFlowCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type CreateAiAgentBlockConnectedMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  request: UndefinedTargetBlockConnectionCreateRequest;
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
  templateID: AiAgentTemplateId;
}>;


export type CreateAiAgentBlockConnectedMutation = { __typename?: 'Mutation', aiAgentCreateWithBlockAndConnection: (
    { __typename?: 'DefaultReplyFlow' }
    & FlowBlocksSlim_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & FlowBlocksSlim_RegularFlow_Fragment
  ) };

export type SetWhatsAppTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextMutation = { __typename?: 'Mutation', whatsAppTextSetText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetTextAndButtonsTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWidgetTextAndButtonsTextMutation = { __typename?: 'Mutation', widgetTextAndButtonsSetText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndButtonsBodyTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndButtonsBodyTextMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsSetBodyText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWidgetContinueFlowButtonMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddWidgetContinueFlowButtonMutation = { __typename?: 'Mutation', widgetTextAndButtonsAddNewContinueFlowButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWidgetOpenUrlButtonMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddWidgetOpenUrlButtonMutation = { __typename?: 'Mutation', widgetTextAndButtonsAddNewOpenURLButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetButtonTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetWidgetButtonTitleMutation = { __typename?: 'Mutation', widgetTextAndButtonsSetButtonTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetButtonUrlMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  url: Scalars['String']['input'];
}>;


export type SetWidgetButtonUrlMutation = { __typename?: 'Mutation', widgetTextAndButtonsSetButtonURL: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type MoveWidgetButtonsMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  orderedButtonIDs: Array<Scalars['ComponentHandleID']['input']> | Scalars['ComponentHandleID']['input'];
}>;


export type MoveWidgetButtonsMutation = { __typename?: 'Mutation', widgetTextAndButtonsMoveButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type DeleteWidgetButtonMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
}>;


export type DeleteWidgetButtonMutation = { __typename?: 'Mutation', widgetTextAndButtonsDeleteButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWhatsAppContinueFlowButtonMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddWhatsAppContinueFlowButtonMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsAddNewContinueFlowButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppButtonTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetWhatsAppButtonTitleMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsSetButtonTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWaListRowMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddWaListRowMutation = { __typename?: 'Mutation', whatsAppListAddRow: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWaListRowTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  rowID: Scalars['ComponentHandleID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetWaListRowTitleMutation = { __typename?: 'Mutation', whatsAppListSetRowTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type ReorderWaListRowsMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  orderedRowIDs: Array<Scalars['ComponentHandleID']['input']> | Scalars['ComponentHandleID']['input'];
}>;


export type ReorderWaListRowsMutation = { __typename?: 'Mutation', whatsAppListReorderRows: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppImageFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
}>;


export type SetWhatsAppImageFileMutation = { __typename?: 'Mutation', whatsAppImageSetImageFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppVideoFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
  fileName: Scalars['String']['input'];
}>;


export type SetWhatsAppVideoFileMutation = { __typename?: 'Mutation', whatsAppVideoSetVideoFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppTextWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppTextSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  saveContactReply: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppTextSaveReplyMutation = { __typename?: 'Mutation', whatsAppTextSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetConditionSegmentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  request: SegmentInput;
}>;


export type SetConditionSegmentMutation = { __typename?: 'Mutation', setConditionUpdateSegment: (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) };

export type SetContactPropertyAttributeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['AttributeName']['input'];
}>;


export type SetContactPropertyAttributeMutation = { __typename?: 'Mutation', setContactPropertySetAttribute: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetContactPropertyValueMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  value: Scalars['String']['input'];
}>;


export type SetContactPropertyValueMutation = { __typename?: 'Mutation', setContactPropertySetValue: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetRedirectTargetFlowMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  targetFlowID: Scalars['FlowID']['input'];
}>;


export type SetRedirectTargetFlowMutation = { __typename?: 'Mutation', redirectToFlowSetTargetFlow: (
    { __typename?: 'RedirectToFlowBlock' }
    & BlockParts_RedirectToFlowBlock_Fragment
  ) };

export type SetSendJsonUrlMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  url: Scalars['String']['input'];
}>;


export type SetSendJsonUrlMutation = { __typename?: 'Mutation', sendJsonUpdateURL: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonMethodMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  method: SendJsonHttpMethod;
}>;


export type SetSendJsonMethodMutation = { __typename?: 'Mutation', sendJsonUpdateHTTPMethod: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddSendJsonHeaderMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddSendJsonHeaderMutation = { __typename?: 'Mutation', sendJsonAddHeader: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type TestSendJsonRequestMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type TestSendJsonRequestMutation = { __typename?: 'Mutation', sendJsonTestRequest: { __typename?: 'SendJsonTestResponse', statusCode: number, statusName: string, requestURL: string, requestMethod: string, requestBody: string, responseBody: string, requestHeaders: Array<{ __typename?: 'SendJsonTestHeaderValue', header: string, value: string }>, responseHeaders: Array<{ __typename?: 'SendJsonTestHeaderValue', header: string, value: string }> } };

export type SetAiAgentInstructionsMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  instructions: Scalars['String']['input'];
}>;


export type SetAiAgentInstructionsMutation = { __typename?: 'Mutation', aiAgentUpdateAdditionalInstructions: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type AddAiAgentRuleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddAiAgentRuleMutation = { __typename?: 'Mutation', aiAgentCreateRule: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type SetAiAgentRuleTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['ComponentHandleID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetAiAgentRuleTitleMutation = { __typename?: 'Mutation', aiAgentUpdateRuleTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type SetAiAgentRulePromptMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['ComponentHandleID']['input'];
  prompt: Scalars['String']['input'];
}>;


export type SetAiAgentRulePromptMutation = { __typename?: 'Mutation', aiAgentUpdateRulePrompt: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type DeleteAiAgentRuleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['ComponentHandleID']['input'];
}>;


export type DeleteAiAgentRuleMutation = { __typename?: 'Mutation', aiAgentDeleteRule: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type SetAiAgentCustomPromptMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  prompt: Scalars['String']['input'];
}>;


export type SetAiAgentCustomPromptMutation = { __typename?: 'Mutation', aiAgentCustomUpdatePrompt: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type SetAttributeDefaultValueMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  attributeName: Scalars['AttributeName']['input'];
  defaultValue: Scalars['String']['input'];
}>;


export type SetAttributeDefaultValueMutation = { __typename?: 'Mutation', botAttributeUpdateDefaultVal: { __typename?: 'Bot', id: string } };

export type SetWhatsAppImageCaptionMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  caption: Scalars['String']['input'];
}>;


export type SetWhatsAppImageCaptionMutation = { __typename?: 'Mutation', whatsAppImageSetCaption: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppImageWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppImageWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppImageSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppImageSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppImageSaveReplyMutation = { __typename?: 'Mutation', whatsAppImageSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppVideoCaptionMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  caption: Scalars['String']['input'];
}>;


export type SetWhatsAppVideoCaptionMutation = { __typename?: 'Mutation', whatsAppVideoSetCaption: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppVideoWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppVideoWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppVideoSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppVideoSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppVideoSaveReplyMutation = { __typename?: 'Mutation', whatsAppVideoSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppAudioFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
  fileName: Scalars['String']['input'];
}>;


export type SetWhatsAppAudioFileMutation = { __typename?: 'Mutation', whatsAppAudioSetAudioFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppAudioWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppAudioWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppAudioSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppAudioSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppAudioSaveReplyMutation = { __typename?: 'Mutation', whatsAppAudioSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppDocumentFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
  fileName: Scalars['String']['input'];
}>;


export type SetWhatsAppDocumentFileMutation = { __typename?: 'Mutation', whatsAppDocumentSetDocumentFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppDocumentCaptionMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  caption: Scalars['String']['input'];
}>;


export type SetWhatsAppDocumentCaptionMutation = { __typename?: 'Mutation', whatsAppDocumentSetCaption: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppDocumentWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppDocumentWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppDocumentSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppDocumentSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppDocumentSaveReplyMutation = { __typename?: 'Mutation', whatsAppDocumentSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetImageFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
}>;


export type SetWidgetImageFileMutation = { __typename?: 'Mutation', widgetImageSetImageFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetImageWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWidgetImageWaitForRepliesMutation = { __typename?: 'Mutation', widgetImageSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetImageSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWidgetImageSaveReplyMutation = { __typename?: 'Mutation', widgetImageSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type AddWidgetPhoneButtonMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddWidgetPhoneButtonMutation = { __typename?: 'Mutation', widgetTextAndButtonsAddNewPhoneButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetButtonPhoneMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  phone: Scalars['String']['input'];
}>;


export type SetWidgetButtonPhoneMutation = { __typename?: 'Mutation', widgetTextAndButtonsSetButtonPhone: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetTextAndButtonsWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWidgetTextAndButtonsWaitForRepliesMutation = { __typename?: 'Mutation', widgetTextAndButtonsSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWidgetTextAndButtonsSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWidgetTextAndButtonsSaveReplyMutation = { __typename?: 'Mutation', widgetTextAndButtonsSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndButtonsHeaderTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndButtonsHeaderTextMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsSetHeaderText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndButtonsFooterTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndButtonsFooterTextMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsSetFooterText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type DeleteWhatsAppButtonMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
}>;


export type DeleteWhatsAppButtonMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsDeleteButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type MoveWhatsAppButtonsMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  orderedButtonIDs: Array<Scalars['ComponentHandleID']['input']> | Scalars['ComponentHandleID']['input'];
}>;


export type MoveWhatsAppButtonsMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsMoveButton: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndButtonsWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppTextAndButtonsWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndButtonsSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppTextAndButtonsSaveReplyMutation = { __typename?: 'Mutation', whatsAppTextAndButtonsSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlBodyTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndUrlBodyTextMutation = { __typename?: 'Mutation', whatsAppTextAndURLSetBodyText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlHeaderTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndUrlHeaderTextMutation = { __typename?: 'Mutation', whatsAppTextAndURLSetHeaderText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlFooterTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndUrlFooterTextMutation = { __typename?: 'Mutation', whatsAppTextAndURLSetFooterText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlButtonTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndUrlButtonTitleMutation = { __typename?: 'Mutation', whatsAppTextAndURLSetButtonTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlButtonUrlMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  url: Scalars['String']['input'];
}>;


export type SetWhatsAppTextAndUrlButtonUrlMutation = { __typename?: 'Mutation', whatsAppTextAndURLSetButtonURL: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppTextAndUrlWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppTextAndURLWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTextAndUrlSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppTextAndUrlSaveReplyMutation = { __typename?: 'Mutation', whatsAppTextAndURLSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWaListBodyTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWaListBodyTextMutation = { __typename?: 'Mutation', whatsAppListSetBodyText: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWaListButtonTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  text: Scalars['String']['input'];
}>;


export type SetWaListButtonTitleMutation = { __typename?: 'Mutation', whatsAppListSetButtonTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWaListRowDescriptionMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  rowID: Scalars['ComponentHandleID']['input'];
  description: Scalars['String']['input'];
}>;


export type SetWaListRowDescriptionMutation = { __typename?: 'Mutation', whatsAppListSetRowDescription: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type DeleteWaListRowMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  rowID: Scalars['ComponentHandleID']['input'];
}>;


export type DeleteWaListRowMutation = { __typename?: 'Mutation', whatsAppListDeleteRow: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWaListWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWaListWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppListWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWaListSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWaListSaveReplyMutation = { __typename?: 'Mutation', whatsAppListSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type WhatsAppTemplatesCatalogQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type WhatsAppTemplatesCatalogQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, whatsAppTemplates?: { __typename?: 'WhatsappTemplates', edges: Array<{ __typename?: 'WhatsAppTemplateEdge', cursor?: string | null, node: { __typename?: 'WhatsAppTemplate', id: string, name: string, status: WhatsAppTemplateStatus, language: WhatsAppTemplateLanguage, category: WhatsAppTemplateCategory, IsSupportedInFlowbuilder: boolean } }>, pageInfo: { __typename?: 'WhatsappTemplatesPageInfo', hasNextPage: boolean, endCursor?: string | null } } | null } };

export type SetWhatsAppTemplateMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  templateID: Scalars['WhatsAppTemplateID']['input'];
}>;


export type SetWhatsAppTemplateMutation = { __typename?: 'Mutation', whatsAppTemplateSetTemplate: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type DeleteWhatsAppTemplateMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type DeleteWhatsAppTemplateMutation = { __typename?: 'Mutation', whatsAppTemplateDeleteTemplate: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateBodyTextParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type SetWhatsAppTemplateBodyTextParamMutation = { __typename?: 'Mutation', whatsAppTemplateSetBodyTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateHeaderTextParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type SetWhatsAppTemplateHeaderTextParamMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateFooterTextParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type SetWhatsAppTemplateFooterTextParamMutation = { __typename?: 'Mutation', whatsAppTemplateSetFooterTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateHeaderImageFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
}>;


export type SetWhatsAppTemplateHeaderImageFileMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderImageFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateHeaderVideoFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
}>;


export type SetWhatsAppTemplateHeaderVideoFileMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderVideoFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateHeaderDocumentFileMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
  fileName: Scalars['String']['input'];
}>;


export type SetWhatsAppTemplateHeaderDocumentFileMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderDocumentFile: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateUrlButtonTextParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type SetWhatsAppTemplateUrlButtonTextParamMutation = { __typename?: 'Mutation', whatsAppTemplateSetURLButtonTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateCopyCodeButtonCodeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  codeValue: Scalars['String']['input'];
}>;


export type SetWhatsAppTemplateCopyCodeButtonCodeMutation = { __typename?: 'Mutation', whatsAppTemplateSetCopyCodeButtonCodeValue: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateWaitForRepliesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  waitForReplies: Scalars['Boolean']['input'];
}>;


export type SetWhatsAppTemplateWaitForRepliesMutation = { __typename?: 'Mutation', whatsAppTemplateSetWaitForReplies: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetWhatsAppTemplateSaveReplyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  save: Scalars['Boolean']['input'];
  attribute?: InputMaybe<Scalars['AttributeName']['input']>;
}>;


export type SetWhatsAppTemplateSaveReplyMutation = { __typename?: 'Mutation', whatsAppTemplateSetSaveContactReplyToAttribute: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BlockParts_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BlockParts_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BlockParts_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BlockParts_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BlockParts_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type SetClearContactPropertyAttributeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['AttributeName']['input'];
}>;


export type SetClearContactPropertyAttributeMutation = { __typename?: 'Mutation', clearContactPropertySetAttribute: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonHeaderTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  headerID: Scalars['SendJsonHeaderID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetSendJsonHeaderTitleMutation = { __typename?: 'Mutation', sendJsonUpdateHeaderTitle: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonHeaderValueMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  headerID: Scalars['SendJsonHeaderID']['input'];
  value: Scalars['String']['input'];
}>;


export type SetSendJsonHeaderValueMutation = { __typename?: 'Mutation', sendJsonUpdateHeaderValue: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type DeleteSendJsonHeaderMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  headerID: Scalars['SendJsonHeaderID']['input'];
}>;


export type DeleteSendJsonHeaderMutation = { __typename?: 'Mutation', sendJsonDeleteHeader: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonPayloadTypeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  payloadType: SendJsonPayloadType;
}>;


export type SetSendJsonPayloadTypeMutation = { __typename?: 'Mutation', sendJsonUpdatePayloadType: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonCustomPayloadMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  payload: Scalars['String']['input'];
}>;


export type SetSendJsonCustomPayloadMutation = { __typename?: 'Mutation', sendJsonUpdateCustomRequestPayload: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddSendJsonUrlParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddSendJsonUrlParamMutation = { __typename?: 'Mutation', sendJsonAddURLParam: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonUrlParamTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  paramID: Scalars['SendJsonURLParamID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetSendJsonUrlParamTitleMutation = { __typename?: 'Mutation', sendJsonUpdateURLParamTitle: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonUrlParamValueMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  paramID: Scalars['SendJsonURLParamID']['input'];
  value: Scalars['String']['input'];
}>;


export type SetSendJsonUrlParamValueMutation = { __typename?: 'Mutation', sendJsonUpdateURLParamValue: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type DeleteSendJsonUrlParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  paramID: Scalars['SendJsonURLParamID']['input'];
}>;


export type DeleteSendJsonUrlParamMutation = { __typename?: 'Mutation', sendJsonDeleteURLParam: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddSendJsonParsingRuleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddSendJsonParsingRuleMutation = { __typename?: 'Mutation', sendJsonResponseAddParsingRule: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonParsingRuleAttributeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['SendJsonResponseParsingRuleID']['input'];
  name: Scalars['AttributeName']['input'];
}>;


export type SetSendJsonParsingRuleAttributeMutation = { __typename?: 'Mutation', sendJsonUpdateResponseParsingRuleAttributeName: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSendJsonParsingRuleJsonPathMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['SendJsonResponseParsingRuleID']['input'];
  path: Scalars['String']['input'];
}>;


export type SetSendJsonParsingRuleJsonPathMutation = { __typename?: 'Mutation', sendJsonUpdateResponseParsingRuleJSONPath: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type DeleteSendJsonParsingRuleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['SendJsonResponseParsingRuleID']['input'];
}>;


export type DeleteSendJsonParsingRuleMutation = { __typename?: 'Mutation', sendJsonDeleteResponseParsingRule: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type EnableSendJsonParsingRulesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type EnableSendJsonParsingRulesMutation = { __typename?: 'Mutation', sendJsonEnableResponseParsingRules: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type DisableSendJsonParsingRulesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type DisableSendJsonParsingRulesMutation = { __typename?: 'Mutation', sendJsonDisableResponseParsingRules: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type AddSummarizeChatEntryMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['AttributeName']['input'];
  description: Scalars['String']['input'];
  addAsFirst: Scalars['Boolean']['input'];
}>;


export type AddSummarizeChatEntryMutation = { __typename?: 'Mutation', summarizeChatAddEntry: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type SetSummarizeChatEntryMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  id: Scalars['String']['input'];
  name: Scalars['AttributeName']['input'];
  description: Scalars['String']['input'];
}>;


export type SetSummarizeChatEntryMutation = { __typename?: 'Mutation', summarizeChatUpdateEntry: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type DeleteSummarizeChatEntryMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  id: Scalars['String']['input'];
}>;


export type DeleteSummarizeChatEntryMutation = { __typename?: 'Mutation', summarizeChatDeleteEntry: (
    { __typename?: 'ClearContactPropertyBlock' }
    & BlockParts_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BlockParts_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BlockParts_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BlockParts_SetContactPropertyBlock_Fragment
  ) };

export type RemoveRedirectTargetFlowMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type RemoveRedirectTargetFlowMutation = { __typename?: 'Mutation', redirectToFlowRemoveTargetFlow: (
    { __typename?: 'RedirectToFlowBlock' }
    & BlockParts_RedirectToFlowBlock_Fragment
  ) };

export type SetDefaultReplyFrequencyMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  frequency: DefaultReplyFrequency;
}>;


export type SetDefaultReplyFrequencyMutation = { __typename?: 'Mutation', defaultReplySetFrequency: (
    { __typename?: 'DefaultReplyBlock' }
    & BlockParts_DefaultReplyBlock_Fragment
  ) };

export type SetTriggeredMessageSegmentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  request: SegmentInput;
}>;


export type SetTriggeredMessageSegmentMutation = { __typename?: 'Mutation', triggeredMessageSetSegment: (
    { __typename?: 'TriggeredMessageBlock' }
    & BlockParts_TriggeredMessageBlock_Fragment
  ) };

export type SetTriggerConditionTypeMutationVariables = Exact<{
  triggerID: Scalars['TriggerID']['input'];
  conditionType: TriggerConditionType;
}>;


export type SetTriggerConditionTypeMutation = { __typename?: 'Mutation', triggerSetConditionType: (
    { __typename?: 'Trigger' }
    & TriggerPartsFragment
  ) };

export type SetTriggerDelayMutationVariables = Exact<{
  triggerID: Scalars['TriggerID']['input'];
  delay: TriggerDelayInput;
}>;


export type SetTriggerDelayMutation = { __typename?: 'Mutation', triggerSetDelay: (
    { __typename?: 'Trigger' }
    & TriggerPartsFragment
  ) };

export type SetTriggerAttributeFilterMutationVariables = Exact<{
  triggerID: Scalars['TriggerID']['input'];
  attrCondition: AttrFilterInput;
}>;


export type SetTriggerAttributeFilterMutation = { __typename?: 'Mutation', triggerSetAttributeFilter: (
    { __typename?: 'Trigger' }
    & TriggerPartsFragment
  ) };

export type DeleteTriggerAttributeFilterMutationVariables = Exact<{
  triggerID: Scalars['TriggerID']['input'];
}>;


export type DeleteTriggerAttributeFilterMutation = { __typename?: 'Mutation', triggerDeleteAttributeFilter: (
    { __typename?: 'Trigger' }
    & TriggerPartsFragment
  ) };

export type SetOneTimeNotificationSegmentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  request: SegmentInput;
}>;


export type SetOneTimeNotificationSegmentMutation = { __typename?: 'Mutation', whatsAppOneTimeNotificationUpdateSegment: (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BlockParts_WhatsAppOneTimeNotificationBlock_Fragment
  ) };

export type SendOneTimeNotificationMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type SendOneTimeNotificationMutation = { __typename?: 'Mutation', whatsAppOneTimeNotificationSend: (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BlockParts_WhatsAppOneTimeNotificationBlock_Fragment
  ) };

export type SetScheduledMessageSegmentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  request: SegmentInput;
}>;


export type SetScheduledMessageSegmentMutation = { __typename?: 'Mutation', whatsAppScheduledMessageUpdateSegment: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type SetScheduledMessageRepeatTypeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  repeatType: BroadcastRepeatType;
}>;


export type SetScheduledMessageRepeatTypeMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetRepeatType: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type SetScheduledMessageWeekdaysMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  weekdays?: InputMaybe<Array<Weekday> | Weekday>;
}>;


export type SetScheduledMessageWeekdaysMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetWeekdays: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type SetScheduledMessageRepeatEveryNDaysMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  everyNDays: Scalars['Int']['input'];
}>;


export type SetScheduledMessageRepeatEveryNDaysMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetRepeatEveryNDays: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type SetScheduledMessageOnCertainDatesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  certainDates: Array<Scalars['Time']['input']> | Scalars['Time']['input'];
}>;


export type SetScheduledMessageOnCertainDatesMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetOnCertainDates: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type SetScheduledMessageFirstSendTimeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  firstSendTime: Scalars['Time']['input'];
  correctedWeekdays: Array<Weekday> | Weekday;
}>;


export type SetScheduledMessageFirstSendTimeMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetFirstSendTime: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BlockParts_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type SetAiAgentKnowledgeItemPromptMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  knowledgeItemID: Scalars['AiAgentKnowledgeItemID']['input'];
  prompt: Scalars['String']['input'];
}>;


export type SetAiAgentKnowledgeItemPromptMutation = { __typename?: 'Mutation', aiAgentUpdateKnowledgeItemPrompt: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type ClearAiAgentKnowledgeItemPromptsMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type ClearAiAgentKnowledgeItemPromptsMutation = { __typename?: 'Mutation', aiAgentClearAllKnowledgeItemPrompts: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type AddAiAgentCustomRuleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type AddAiAgentCustomRuleMutation = { __typename?: 'Mutation', aiAgentCustomCreateRule: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type SetAiAgentCustomRuleTitleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['ComponentHandleID']['input'];
  title: Scalars['String']['input'];
}>;


export type SetAiAgentCustomRuleTitleMutation = { __typename?: 'Mutation', aiAgentCustomUpdateRuleTitle: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type SetAiAgentCustomRulePromptMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['ComponentHandleID']['input'];
  prompt: Scalars['String']['input'];
}>;


export type SetAiAgentCustomRulePromptMutation = { __typename?: 'Mutation', aiAgentCustomUpdateRulePrompt: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type DeleteAiAgentCustomRuleMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  ruleID: Scalars['ComponentHandleID']['input'];
}>;


export type DeleteAiAgentCustomRuleMutation = { __typename?: 'Mutation', aiAgentCustomDeleteRule: (
    { __typename?: 'AiAgentBlock' }
    & BlockParts_AiAgentBlock_Fragment
  ) };

export type FtFileFragment = { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null };

type FtMessageCommon_FacebookInAudioMessage_Fragment = { __typename: 'FacebookInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookInFileMessage_Fragment = { __typename: 'FacebookInFileMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookInImageMessage_Fragment = { __typename: 'FacebookInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookInPostCommentMessage_Fragment = { __typename: 'FacebookInPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookInTextMessage_Fragment = { __typename: 'FacebookInTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookInUnknownMessage_Fragment = { __typename: 'FacebookInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookInVideoMessage_Fragment = { __typename: 'FacebookInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookOutAudioMessage_Fragment = { __typename: 'FacebookOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookOutImageMessage_Fragment = { __typename: 'FacebookOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookOutPublicCommentReplyMessage_Fragment = { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookOutTextMessage_Fragment = { __typename: 'FacebookOutTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookOutUnknownMessage_Fragment = { __typename: 'FacebookOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_FacebookOutVideoMessage_Fragment = { __typename: 'FacebookOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInAdCommentMessage_Fragment = { __typename: 'InstagramInAdCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInAudioMessage_Fragment = { __typename: 'InstagramInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInFeedCommentMessage_Fragment = { __typename: 'InstagramInFeedCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInImageMessage_Fragment = { __typename: 'InstagramInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInReelCommentMessage_Fragment = { __typename: 'InstagramInReelCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInStoryReplyMessage_Fragment = { __typename: 'InstagramInStoryReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInTextMessage_Fragment = { __typename: 'InstagramInTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInUnknownMessage_Fragment = { __typename: 'InstagramInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramInVideoMessage_Fragment = { __typename: 'InstagramInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramOutAudioMessage_Fragment = { __typename: 'InstagramOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramOutImageMessage_Fragment = { __typename: 'InstagramOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramOutPublicCommentReplyMessage_Fragment = { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramOutTextMessage_Fragment = { __typename: 'InstagramOutTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramOutUnknownMessage_Fragment = { __typename: 'InstagramOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_InstagramOutVideoMessage_Fragment = { __typename: 'InstagramOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemConversationSummaryMessage_Fragment = { __typename: 'SystemConversationSummaryMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedByBooking_Fragment = { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedByCoexMessage_Fragment = { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedByComponentMessage_Fragment = { __typename: 'SystemLivechatOpenedByComponentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemLivechatOpenedManuallyMessage_Fragment = { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemMetaConversionEventSentMessage_Fragment = { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_SystemTypingMessage_Fragment = { __typename: 'SystemTypingMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokInImageMessage_Fragment = { __typename: 'TikTokInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokInTextMessage_Fragment = { __typename: 'TikTokInTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokInTextPostCommentMessage_Fragment = { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokInUnknownMessage_Fragment = { __typename: 'TikTokInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokOutImageMessage_Fragment = { __typename: 'TikTokOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokOutPublicCommentReplyMessage_Fragment = { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokOutTextMessage_Fragment = { __typename: 'TikTokOutTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_TikTokOutUnknownMessage_Fragment = { __typename: 'TikTokOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WebWidgetAttachmentMessage_Fragment = { __typename: 'WebWidgetAttachmentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WebWidgetTextAndButtonsMessage_Fragment = { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WebWidgetTextMessage_Fragment = { __typename: 'WebWidgetTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInAudioMessage_Fragment = { __typename: 'WhatsAppInAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInDocumentMessage_Fragment = { __typename: 'WhatsAppInDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInImageMessage_Fragment = { __typename: 'WhatsAppInImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInListRowClickMessage_Fragment = { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInTextMessage_Fragment = { __typename: 'WhatsAppInTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInUnknownMessage_Fragment = { __typename: 'WhatsAppInUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppInVideoMessage_Fragment = { __typename: 'WhatsAppInVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutAudioMessage_Fragment = { __typename: 'WhatsAppOutAudioMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutDocumentMessage_Fragment = { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutImageMessage_Fragment = { __typename: 'WhatsAppOutImageMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutListMessage_Fragment = { __typename: 'WhatsAppOutListMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutTemplateMessage_Fragment = { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutTextAndUrlMessage_Fragment = { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutTextMessage_Fragment = { __typename: 'WhatsAppOutTextMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutUnknownMessage_Fragment = { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

type FtMessageCommon_WhatsAppOutVideoMessage_Fragment = { __typename: 'WhatsAppOutVideoMessage', id?: string | null, clientId: string, sentTime: string, updatedAt: string, sender: { __typename: 'AdminMessageSender', id: string, name: string } | { __typename: 'AutomationMessageSender', id: string, name: string } | { __typename: 'ContactMessageSender', id: string, name: string } | { __typename: 'FacebookAppSender', id: string, name: string } | { __typename: 'InstagramAppSender', id: string, name: string } | { __typename: 'TikTokAppSender', id: string, name: string } | { __typename: 'WhatsappBusinessAppSender', id: string, name: string }, errors: Array<{ __typename?: 'MessageError', code: MessageErrorCode, date: string }> };

export type FtMessageCommonFragment = FtMessageCommon_FacebookInAudioMessage_Fragment | FtMessageCommon_FacebookInFileMessage_Fragment | FtMessageCommon_FacebookInImageMessage_Fragment | FtMessageCommon_FacebookInPostCommentMessage_Fragment | FtMessageCommon_FacebookInTextMessage_Fragment | FtMessageCommon_FacebookInUnknownMessage_Fragment | FtMessageCommon_FacebookInVideoMessage_Fragment | FtMessageCommon_FacebookOutAudioMessage_Fragment | FtMessageCommon_FacebookOutImageMessage_Fragment | FtMessageCommon_FacebookOutPublicCommentReplyMessage_Fragment | FtMessageCommon_FacebookOutTextMessage_Fragment | FtMessageCommon_FacebookOutUnknownMessage_Fragment | FtMessageCommon_FacebookOutVideoMessage_Fragment | FtMessageCommon_InstagramInAdCommentMessage_Fragment | FtMessageCommon_InstagramInAudioMessage_Fragment | FtMessageCommon_InstagramInFeedCommentMessage_Fragment | FtMessageCommon_InstagramInImageMessage_Fragment | FtMessageCommon_InstagramInReelCommentMessage_Fragment | FtMessageCommon_InstagramInStoryReplyMessage_Fragment | FtMessageCommon_InstagramInTextMessage_Fragment | FtMessageCommon_InstagramInUnknownMessage_Fragment | FtMessageCommon_InstagramInVideoMessage_Fragment | FtMessageCommon_InstagramOutAudioMessage_Fragment | FtMessageCommon_InstagramOutImageMessage_Fragment | FtMessageCommon_InstagramOutPublicCommentReplyMessage_Fragment | FtMessageCommon_InstagramOutTextMessage_Fragment | FtMessageCommon_InstagramOutUnknownMessage_Fragment | FtMessageCommon_InstagramOutVideoMessage_Fragment | FtMessageCommon_SystemConversationSummaryMessage_Fragment | FtMessageCommon_SystemLivechatClosedByAutoClosingMessage_Fragment | FtMessageCommon_SystemLivechatOpenedByBooking_Fragment | FtMessageCommon_SystemLivechatOpenedByCoexMessage_Fragment | FtMessageCommon_SystemLivechatOpenedByComponentMessage_Fragment | FtMessageCommon_SystemLivechatOpenedByFacebookAppMessage_Fragment | FtMessageCommon_SystemLivechatOpenedByInstagramAppMessage_Fragment | FtMessageCommon_SystemLivechatOpenedByTikTokAppMessage_Fragment | FtMessageCommon_SystemLivechatOpenedManuallyMessage_Fragment | FtMessageCommon_SystemMetaConversionEventSentMessage_Fragment | FtMessageCommon_SystemTypingMessage_Fragment | FtMessageCommon_TikTokInImageMessage_Fragment | FtMessageCommon_TikTokInTextMessage_Fragment | FtMessageCommon_TikTokInTextPostCommentMessage_Fragment | FtMessageCommon_TikTokInUnknownMessage_Fragment | FtMessageCommon_TikTokOutImageMessage_Fragment | FtMessageCommon_TikTokOutPublicCommentReplyMessage_Fragment | FtMessageCommon_TikTokOutTextMessage_Fragment | FtMessageCommon_TikTokOutUnknownMessage_Fragment | FtMessageCommon_WebWidgetAttachmentMessage_Fragment | FtMessageCommon_WebWidgetCallPhoneButtonClickMessage_Fragment | FtMessageCommon_WebWidgetContinueFlowButtonClickMessage_Fragment | FtMessageCommon_WebWidgetOpenUrlButtonClickMessage_Fragment | FtMessageCommon_WebWidgetTextAndButtonsMessage_Fragment | FtMessageCommon_WebWidgetTextMessage_Fragment | FtMessageCommon_WhatsAppInAudioMessage_Fragment | FtMessageCommon_WhatsAppInContinueFlowButtonClickMessage_Fragment | FtMessageCommon_WhatsAppInDocumentMessage_Fragment | FtMessageCommon_WhatsAppInImageMessage_Fragment | FtMessageCommon_WhatsAppInListRowClickMessage_Fragment | FtMessageCommon_WhatsAppInMediaPlaceholderMessage_Fragment | FtMessageCommon_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | FtMessageCommon_WhatsAppInTextMessage_Fragment | FtMessageCommon_WhatsAppInUnknownMessage_Fragment | FtMessageCommon_WhatsAppInVideoMessage_Fragment | FtMessageCommon_WhatsAppOutAudioMessage_Fragment | FtMessageCommon_WhatsAppOutDocumentMessage_Fragment | FtMessageCommon_WhatsAppOutImageMessage_Fragment | FtMessageCommon_WhatsAppOutListMessage_Fragment | FtMessageCommon_WhatsAppOutMediaPlaceholderMessage_Fragment | FtMessageCommon_WhatsAppOutTemplateMessage_Fragment | FtMessageCommon_WhatsAppOutTextAndButtonsMessage_Fragment | FtMessageCommon_WhatsAppOutTextAndUrlMessage_Fragment | FtMessageCommon_WhatsAppOutTextMessage_Fragment | FtMessageCommon_WhatsAppOutUnknownMessage_Fragment | FtMessageCommon_WhatsAppOutVideoMessage_Fragment;

type FtWhatsAppParts_FacebookInAudioMessage_Fragment = { __typename?: 'FacebookInAudioMessage' };

type FtWhatsAppParts_FacebookInFileMessage_Fragment = { __typename?: 'FacebookInFileMessage' };

type FtWhatsAppParts_FacebookInImageMessage_Fragment = { __typename?: 'FacebookInImageMessage' };

type FtWhatsAppParts_FacebookInPostCommentMessage_Fragment = { __typename?: 'FacebookInPostCommentMessage' };

type FtWhatsAppParts_FacebookInTextMessage_Fragment = { __typename?: 'FacebookInTextMessage' };

type FtWhatsAppParts_FacebookInUnknownMessage_Fragment = { __typename?: 'FacebookInUnknownMessage' };

type FtWhatsAppParts_FacebookInVideoMessage_Fragment = { __typename?: 'FacebookInVideoMessage' };

type FtWhatsAppParts_FacebookOutAudioMessage_Fragment = { __typename?: 'FacebookOutAudioMessage' };

type FtWhatsAppParts_FacebookOutImageMessage_Fragment = { __typename?: 'FacebookOutImageMessage' };

type FtWhatsAppParts_FacebookOutPublicCommentReplyMessage_Fragment = { __typename?: 'FacebookOutPublicCommentReplyMessage' };

type FtWhatsAppParts_FacebookOutTextMessage_Fragment = { __typename?: 'FacebookOutTextMessage' };

type FtWhatsAppParts_FacebookOutUnknownMessage_Fragment = { __typename?: 'FacebookOutUnknownMessage' };

type FtWhatsAppParts_FacebookOutVideoMessage_Fragment = { __typename?: 'FacebookOutVideoMessage' };

type FtWhatsAppParts_InstagramInAdCommentMessage_Fragment = { __typename?: 'InstagramInAdCommentMessage' };

type FtWhatsAppParts_InstagramInAudioMessage_Fragment = { __typename?: 'InstagramInAudioMessage' };

type FtWhatsAppParts_InstagramInFeedCommentMessage_Fragment = { __typename?: 'InstagramInFeedCommentMessage' };

type FtWhatsAppParts_InstagramInImageMessage_Fragment = { __typename?: 'InstagramInImageMessage' };

type FtWhatsAppParts_InstagramInReelCommentMessage_Fragment = { __typename?: 'InstagramInReelCommentMessage' };

type FtWhatsAppParts_InstagramInStoryReplyMessage_Fragment = { __typename?: 'InstagramInStoryReplyMessage' };

type FtWhatsAppParts_InstagramInTextMessage_Fragment = { __typename?: 'InstagramInTextMessage' };

type FtWhatsAppParts_InstagramInUnknownMessage_Fragment = { __typename?: 'InstagramInUnknownMessage' };

type FtWhatsAppParts_InstagramInVideoMessage_Fragment = { __typename?: 'InstagramInVideoMessage' };

type FtWhatsAppParts_InstagramOutAudioMessage_Fragment = { __typename?: 'InstagramOutAudioMessage' };

type FtWhatsAppParts_InstagramOutImageMessage_Fragment = { __typename?: 'InstagramOutImageMessage' };

type FtWhatsAppParts_InstagramOutPublicCommentReplyMessage_Fragment = { __typename?: 'InstagramOutPublicCommentReplyMessage' };

type FtWhatsAppParts_InstagramOutTextMessage_Fragment = { __typename?: 'InstagramOutTextMessage' };

type FtWhatsAppParts_InstagramOutUnknownMessage_Fragment = { __typename?: 'InstagramOutUnknownMessage' };

type FtWhatsAppParts_InstagramOutVideoMessage_Fragment = { __typename?: 'InstagramOutVideoMessage' };

type FtWhatsAppParts_SystemConversationSummaryMessage_Fragment = { __typename?: 'SystemConversationSummaryMessage' };

type FtWhatsAppParts_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename?: 'SystemLivechatClosedByAutoClosingMessage' };

type FtWhatsAppParts_SystemLivechatOpenedByBooking_Fragment = { __typename?: 'SystemLivechatOpenedByBooking' };

type FtWhatsAppParts_SystemLivechatOpenedByCoexMessage_Fragment = { __typename?: 'SystemLivechatOpenedByCoexMessage' };

type FtWhatsAppParts_SystemLivechatOpenedByComponentMessage_Fragment = { __typename?: 'SystemLivechatOpenedByComponentMessage' };

type FtWhatsAppParts_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' };

type FtWhatsAppParts_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' };

type FtWhatsAppParts_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' };

type FtWhatsAppParts_SystemLivechatOpenedManuallyMessage_Fragment = { __typename?: 'SystemLivechatOpenedManuallyMessage' };

type FtWhatsAppParts_SystemMetaConversionEventSentMessage_Fragment = { __typename?: 'SystemMetaConversionEventSentMessage' };

type FtWhatsAppParts_SystemTypingMessage_Fragment = { __typename?: 'SystemTypingMessage' };

type FtWhatsAppParts_TikTokInImageMessage_Fragment = { __typename?: 'TikTokInImageMessage' };

type FtWhatsAppParts_TikTokInTextMessage_Fragment = { __typename?: 'TikTokInTextMessage' };

type FtWhatsAppParts_TikTokInTextPostCommentMessage_Fragment = { __typename?: 'TikTokInTextPostCommentMessage' };

type FtWhatsAppParts_TikTokInUnknownMessage_Fragment = { __typename?: 'TikTokInUnknownMessage' };

type FtWhatsAppParts_TikTokOutImageMessage_Fragment = { __typename?: 'TikTokOutImageMessage' };

type FtWhatsAppParts_TikTokOutPublicCommentReplyMessage_Fragment = { __typename?: 'TikTokOutPublicCommentReplyMessage' };

type FtWhatsAppParts_TikTokOutTextMessage_Fragment = { __typename?: 'TikTokOutTextMessage' };

type FtWhatsAppParts_TikTokOutUnknownMessage_Fragment = { __typename?: 'TikTokOutUnknownMessage' };

type FtWhatsAppParts_WebWidgetAttachmentMessage_Fragment = { __typename?: 'WebWidgetAttachmentMessage' };

type FtWhatsAppParts_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename?: 'WebWidgetCallPhoneButtonClickMessage' };

type FtWhatsAppParts_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename?: 'WebWidgetContinueFlowButtonClickMessage' };

type FtWhatsAppParts_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename?: 'WebWidgetOpenURLButtonClickMessage' };

type FtWhatsAppParts_WebWidgetTextAndButtonsMessage_Fragment = { __typename?: 'WebWidgetTextAndButtonsMessage' };

type FtWhatsAppParts_WebWidgetTextMessage_Fragment = { __typename?: 'WebWidgetTextMessage' };

type FtWhatsAppParts_WhatsAppInAudioMessage_Fragment = { __typename?: 'WhatsAppInAudioMessage' };

type FtWhatsAppParts_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename?: 'WhatsAppInContinueFlowButtonClickMessage', buttonTitle: string };

type FtWhatsAppParts_WhatsAppInDocumentMessage_Fragment = { __typename?: 'WhatsAppInDocumentMessage' };

type FtWhatsAppParts_WhatsAppInImageMessage_Fragment = { __typename?: 'WhatsAppInImageMessage' };

type FtWhatsAppParts_WhatsAppInListRowClickMessage_Fragment = { __typename?: 'WhatsAppInListRowClickMessage', rowTitle: string, rowDescription?: string | null };

type FtWhatsAppParts_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppInMediaPlaceholderMessage' };

type FtWhatsAppParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage', buttonTitle: string };

type FtWhatsAppParts_WhatsAppInTextMessage_Fragment = { __typename?: 'WhatsAppInTextMessage', text: string };

type FtWhatsAppParts_WhatsAppInUnknownMessage_Fragment = { __typename?: 'WhatsAppInUnknownMessage' };

type FtWhatsAppParts_WhatsAppInVideoMessage_Fragment = { __typename?: 'WhatsAppInVideoMessage' };

type FtWhatsAppParts_WhatsAppOutAudioMessage_Fragment = { __typename?: 'WhatsAppOutAudioMessage', file: (
    { __typename?: 'File' }
    & FtFileFragment
  ) };

type FtWhatsAppParts_WhatsAppOutDocumentMessage_Fragment = { __typename?: 'WhatsAppOutDocumentMessage', caption?: string | null, fileName?: string | null, file: (
    { __typename?: 'File' }
    & FtFileFragment
  ) };

type FtWhatsAppParts_WhatsAppOutImageMessage_Fragment = { __typename?: 'WhatsAppOutImageMessage', caption?: string | null, file: (
    { __typename?: 'File' }
    & FtFileFragment
  ) };

type FtWhatsAppParts_WhatsAppOutListMessage_Fragment = { __typename?: 'WhatsAppOutListMessage', bodyText: string, buttonTitle: string, listRows: Array<{ __typename?: 'WhatsAppMessageListRow', title: string, description?: string | null }> };

type FtWhatsAppParts_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppOutMediaPlaceholderMessage' };

type FtWhatsAppParts_WhatsAppOutTemplateMessage_Fragment = { __typename?: 'WhatsAppOutTemplateMessage', header?: { __typename: 'WhatsAppOutTemplateMessageComponentDocument', file?: (
      { __typename?: 'File' }
      & FtFileFragment
    ) | null } | { __typename: 'WhatsAppOutTemplateMessageComponentImage', file?: (
      { __typename?: 'File' }
      & FtFileFragment
    ) | null } | { __typename: 'WhatsAppOutTemplateMessageComponentText', text: string } | { __typename: 'WhatsAppOutTemplateMessageComponentVideo', file?: (
      { __typename?: 'File' }
      & FtFileFragment
    ) | null } | null, body?: { __typename?: 'WhatsAppOutTemplateMessageComponentText', text: string } | null, footer?: { __typename?: 'WhatsAppOutTemplateMessageComponentText', text: string } | null, waTemplateButtons: Array<{ __typename: 'WhatsAppOutTemplateMessageCallPhoneButton' } | { __typename: 'WhatsAppOutTemplateMessageCopyCodeButton' } | { __typename: 'WhatsAppOutTemplateMessageQuickReplyButton', text: string } | { __typename: 'WhatsAppOutTemplateMessageURLButton', text: string, url: string } | { __typename: 'WhatsAppOutTemplateMessageWhatsAppCallButton' }> };

type FtWhatsAppParts_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename?: 'WhatsAppOutTextAndButtonsMessage', headerText?: string | null, bodyText: string, footerText?: string | null, whatsappButtons: Array<{ __typename: 'WhatsAppContinueFlowMessageButton', title: string } | { __typename: 'WhatsAppOpenURLMessageButton', url: string, title: string }> };

type FtWhatsAppParts_WhatsAppOutTextAndUrlMessage_Fragment = { __typename?: 'WhatsAppOutTextAndURLMessage', headerText?: string | null, bodyText: string, footerText?: string | null, whatsappButtons: Array<{ __typename: 'WhatsAppContinueFlowMessageButton', title: string } | { __typename: 'WhatsAppOpenURLMessageButton', url: string, title: string }> };

type FtWhatsAppParts_WhatsAppOutTextMessage_Fragment = { __typename?: 'WhatsAppOutTextMessage', text: string };

type FtWhatsAppParts_WhatsAppOutUnknownMessage_Fragment = { __typename?: 'WhatsAppOutUnknownMessage' };

type FtWhatsAppParts_WhatsAppOutVideoMessage_Fragment = { __typename?: 'WhatsAppOutVideoMessage', caption?: string | null, file: (
    { __typename?: 'File' }
    & FtFileFragment
  ) };

export type FtWhatsAppPartsFragment = FtWhatsAppParts_FacebookInAudioMessage_Fragment | FtWhatsAppParts_FacebookInFileMessage_Fragment | FtWhatsAppParts_FacebookInImageMessage_Fragment | FtWhatsAppParts_FacebookInPostCommentMessage_Fragment | FtWhatsAppParts_FacebookInTextMessage_Fragment | FtWhatsAppParts_FacebookInUnknownMessage_Fragment | FtWhatsAppParts_FacebookInVideoMessage_Fragment | FtWhatsAppParts_FacebookOutAudioMessage_Fragment | FtWhatsAppParts_FacebookOutImageMessage_Fragment | FtWhatsAppParts_FacebookOutPublicCommentReplyMessage_Fragment | FtWhatsAppParts_FacebookOutTextMessage_Fragment | FtWhatsAppParts_FacebookOutUnknownMessage_Fragment | FtWhatsAppParts_FacebookOutVideoMessage_Fragment | FtWhatsAppParts_InstagramInAdCommentMessage_Fragment | FtWhatsAppParts_InstagramInAudioMessage_Fragment | FtWhatsAppParts_InstagramInFeedCommentMessage_Fragment | FtWhatsAppParts_InstagramInImageMessage_Fragment | FtWhatsAppParts_InstagramInReelCommentMessage_Fragment | FtWhatsAppParts_InstagramInStoryReplyMessage_Fragment | FtWhatsAppParts_InstagramInTextMessage_Fragment | FtWhatsAppParts_InstagramInUnknownMessage_Fragment | FtWhatsAppParts_InstagramInVideoMessage_Fragment | FtWhatsAppParts_InstagramOutAudioMessage_Fragment | FtWhatsAppParts_InstagramOutImageMessage_Fragment | FtWhatsAppParts_InstagramOutPublicCommentReplyMessage_Fragment | FtWhatsAppParts_InstagramOutTextMessage_Fragment | FtWhatsAppParts_InstagramOutUnknownMessage_Fragment | FtWhatsAppParts_InstagramOutVideoMessage_Fragment | FtWhatsAppParts_SystemConversationSummaryMessage_Fragment | FtWhatsAppParts_SystemLivechatClosedByAutoClosingMessage_Fragment | FtWhatsAppParts_SystemLivechatOpenedByBooking_Fragment | FtWhatsAppParts_SystemLivechatOpenedByCoexMessage_Fragment | FtWhatsAppParts_SystemLivechatOpenedByComponentMessage_Fragment | FtWhatsAppParts_SystemLivechatOpenedByFacebookAppMessage_Fragment | FtWhatsAppParts_SystemLivechatOpenedByInstagramAppMessage_Fragment | FtWhatsAppParts_SystemLivechatOpenedByTikTokAppMessage_Fragment | FtWhatsAppParts_SystemLivechatOpenedManuallyMessage_Fragment | FtWhatsAppParts_SystemMetaConversionEventSentMessage_Fragment | FtWhatsAppParts_SystemTypingMessage_Fragment | FtWhatsAppParts_TikTokInImageMessage_Fragment | FtWhatsAppParts_TikTokInTextMessage_Fragment | FtWhatsAppParts_TikTokInTextPostCommentMessage_Fragment | FtWhatsAppParts_TikTokInUnknownMessage_Fragment | FtWhatsAppParts_TikTokOutImageMessage_Fragment | FtWhatsAppParts_TikTokOutPublicCommentReplyMessage_Fragment | FtWhatsAppParts_TikTokOutTextMessage_Fragment | FtWhatsAppParts_TikTokOutUnknownMessage_Fragment | FtWhatsAppParts_WebWidgetAttachmentMessage_Fragment | FtWhatsAppParts_WebWidgetCallPhoneButtonClickMessage_Fragment | FtWhatsAppParts_WebWidgetContinueFlowButtonClickMessage_Fragment | FtWhatsAppParts_WebWidgetOpenUrlButtonClickMessage_Fragment | FtWhatsAppParts_WebWidgetTextAndButtonsMessage_Fragment | FtWhatsAppParts_WebWidgetTextMessage_Fragment | FtWhatsAppParts_WhatsAppInAudioMessage_Fragment | FtWhatsAppParts_WhatsAppInContinueFlowButtonClickMessage_Fragment | FtWhatsAppParts_WhatsAppInDocumentMessage_Fragment | FtWhatsAppParts_WhatsAppInImageMessage_Fragment | FtWhatsAppParts_WhatsAppInListRowClickMessage_Fragment | FtWhatsAppParts_WhatsAppInMediaPlaceholderMessage_Fragment | FtWhatsAppParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | FtWhatsAppParts_WhatsAppInTextMessage_Fragment | FtWhatsAppParts_WhatsAppInUnknownMessage_Fragment | FtWhatsAppParts_WhatsAppInVideoMessage_Fragment | FtWhatsAppParts_WhatsAppOutAudioMessage_Fragment | FtWhatsAppParts_WhatsAppOutDocumentMessage_Fragment | FtWhatsAppParts_WhatsAppOutImageMessage_Fragment | FtWhatsAppParts_WhatsAppOutListMessage_Fragment | FtWhatsAppParts_WhatsAppOutMediaPlaceholderMessage_Fragment | FtWhatsAppParts_WhatsAppOutTemplateMessage_Fragment | FtWhatsAppParts_WhatsAppOutTextAndButtonsMessage_Fragment | FtWhatsAppParts_WhatsAppOutTextAndUrlMessage_Fragment | FtWhatsAppParts_WhatsAppOutTextMessage_Fragment | FtWhatsAppParts_WhatsAppOutUnknownMessage_Fragment | FtWhatsAppParts_WhatsAppOutVideoMessage_Fragment;

type FtWidgetParts_FacebookInAudioMessage_Fragment = { __typename?: 'FacebookInAudioMessage' };

type FtWidgetParts_FacebookInFileMessage_Fragment = { __typename?: 'FacebookInFileMessage' };

type FtWidgetParts_FacebookInImageMessage_Fragment = { __typename?: 'FacebookInImageMessage' };

type FtWidgetParts_FacebookInPostCommentMessage_Fragment = { __typename?: 'FacebookInPostCommentMessage' };

type FtWidgetParts_FacebookInTextMessage_Fragment = { __typename?: 'FacebookInTextMessage' };

type FtWidgetParts_FacebookInUnknownMessage_Fragment = { __typename?: 'FacebookInUnknownMessage' };

type FtWidgetParts_FacebookInVideoMessage_Fragment = { __typename?: 'FacebookInVideoMessage' };

type FtWidgetParts_FacebookOutAudioMessage_Fragment = { __typename?: 'FacebookOutAudioMessage' };

type FtWidgetParts_FacebookOutImageMessage_Fragment = { __typename?: 'FacebookOutImageMessage' };

type FtWidgetParts_FacebookOutPublicCommentReplyMessage_Fragment = { __typename?: 'FacebookOutPublicCommentReplyMessage' };

type FtWidgetParts_FacebookOutTextMessage_Fragment = { __typename?: 'FacebookOutTextMessage' };

type FtWidgetParts_FacebookOutUnknownMessage_Fragment = { __typename?: 'FacebookOutUnknownMessage' };

type FtWidgetParts_FacebookOutVideoMessage_Fragment = { __typename?: 'FacebookOutVideoMessage' };

type FtWidgetParts_InstagramInAdCommentMessage_Fragment = { __typename?: 'InstagramInAdCommentMessage' };

type FtWidgetParts_InstagramInAudioMessage_Fragment = { __typename?: 'InstagramInAudioMessage' };

type FtWidgetParts_InstagramInFeedCommentMessage_Fragment = { __typename?: 'InstagramInFeedCommentMessage' };

type FtWidgetParts_InstagramInImageMessage_Fragment = { __typename?: 'InstagramInImageMessage' };

type FtWidgetParts_InstagramInReelCommentMessage_Fragment = { __typename?: 'InstagramInReelCommentMessage' };

type FtWidgetParts_InstagramInStoryReplyMessage_Fragment = { __typename?: 'InstagramInStoryReplyMessage' };

type FtWidgetParts_InstagramInTextMessage_Fragment = { __typename?: 'InstagramInTextMessage' };

type FtWidgetParts_InstagramInUnknownMessage_Fragment = { __typename?: 'InstagramInUnknownMessage' };

type FtWidgetParts_InstagramInVideoMessage_Fragment = { __typename?: 'InstagramInVideoMessage' };

type FtWidgetParts_InstagramOutAudioMessage_Fragment = { __typename?: 'InstagramOutAudioMessage' };

type FtWidgetParts_InstagramOutImageMessage_Fragment = { __typename?: 'InstagramOutImageMessage' };

type FtWidgetParts_InstagramOutPublicCommentReplyMessage_Fragment = { __typename?: 'InstagramOutPublicCommentReplyMessage' };

type FtWidgetParts_InstagramOutTextMessage_Fragment = { __typename?: 'InstagramOutTextMessage' };

type FtWidgetParts_InstagramOutUnknownMessage_Fragment = { __typename?: 'InstagramOutUnknownMessage' };

type FtWidgetParts_InstagramOutVideoMessage_Fragment = { __typename?: 'InstagramOutVideoMessage' };

type FtWidgetParts_SystemConversationSummaryMessage_Fragment = { __typename?: 'SystemConversationSummaryMessage' };

type FtWidgetParts_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename?: 'SystemLivechatClosedByAutoClosingMessage' };

type FtWidgetParts_SystemLivechatOpenedByBooking_Fragment = { __typename?: 'SystemLivechatOpenedByBooking' };

type FtWidgetParts_SystemLivechatOpenedByCoexMessage_Fragment = { __typename?: 'SystemLivechatOpenedByCoexMessage' };

type FtWidgetParts_SystemLivechatOpenedByComponentMessage_Fragment = { __typename?: 'SystemLivechatOpenedByComponentMessage' };

type FtWidgetParts_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' };

type FtWidgetParts_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' };

type FtWidgetParts_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' };

type FtWidgetParts_SystemLivechatOpenedManuallyMessage_Fragment = { __typename?: 'SystemLivechatOpenedManuallyMessage' };

type FtWidgetParts_SystemMetaConversionEventSentMessage_Fragment = { __typename?: 'SystemMetaConversionEventSentMessage' };

type FtWidgetParts_SystemTypingMessage_Fragment = { __typename?: 'SystemTypingMessage' };

type FtWidgetParts_TikTokInImageMessage_Fragment = { __typename?: 'TikTokInImageMessage' };

type FtWidgetParts_TikTokInTextMessage_Fragment = { __typename?: 'TikTokInTextMessage' };

type FtWidgetParts_TikTokInTextPostCommentMessage_Fragment = { __typename?: 'TikTokInTextPostCommentMessage' };

type FtWidgetParts_TikTokInUnknownMessage_Fragment = { __typename?: 'TikTokInUnknownMessage' };

type FtWidgetParts_TikTokOutImageMessage_Fragment = { __typename?: 'TikTokOutImageMessage' };

type FtWidgetParts_TikTokOutPublicCommentReplyMessage_Fragment = { __typename?: 'TikTokOutPublicCommentReplyMessage' };

type FtWidgetParts_TikTokOutTextMessage_Fragment = { __typename?: 'TikTokOutTextMessage' };

type FtWidgetParts_TikTokOutUnknownMessage_Fragment = { __typename?: 'TikTokOutUnknownMessage' };

type FtWidgetParts_WebWidgetAttachmentMessage_Fragment = { __typename?: 'WebWidgetAttachmentMessage' };

type FtWidgetParts_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename?: 'WebWidgetCallPhoneButtonClickMessage', button: { __typename?: 'WebWidgetCallPhoneButton', title: string, phone: string } };

type FtWidgetParts_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename?: 'WebWidgetContinueFlowButtonClickMessage', button: { __typename?: 'WebWidgetContinueFlowButton', title: string } };

type FtWidgetParts_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename?: 'WebWidgetOpenURLButtonClickMessage', button: { __typename?: 'WebWidgetOpenURLButton', title: string, url: string } };

type FtWidgetParts_WebWidgetTextAndButtonsMessage_Fragment = { __typename?: 'WebWidgetTextAndButtonsMessage', text: string, buttons: Array<{ __typename: 'WebWidgetCallPhoneButton', phone: string, title: string } | { __typename: 'WebWidgetContinueFlowButton', title: string } | { __typename: 'WebWidgetOpenURLButton', url: string, title: string }> };

type FtWidgetParts_WebWidgetTextMessage_Fragment = { __typename?: 'WebWidgetTextMessage', text: string };

type FtWidgetParts_WhatsAppInAudioMessage_Fragment = { __typename?: 'WhatsAppInAudioMessage' };

type FtWidgetParts_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' };

type FtWidgetParts_WhatsAppInDocumentMessage_Fragment = { __typename?: 'WhatsAppInDocumentMessage' };

type FtWidgetParts_WhatsAppInImageMessage_Fragment = { __typename?: 'WhatsAppInImageMessage' };

type FtWidgetParts_WhatsAppInListRowClickMessage_Fragment = { __typename?: 'WhatsAppInListRowClickMessage' };

type FtWidgetParts_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppInMediaPlaceholderMessage' };

type FtWidgetParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' };

type FtWidgetParts_WhatsAppInTextMessage_Fragment = { __typename?: 'WhatsAppInTextMessage' };

type FtWidgetParts_WhatsAppInUnknownMessage_Fragment = { __typename?: 'WhatsAppInUnknownMessage' };

type FtWidgetParts_WhatsAppInVideoMessage_Fragment = { __typename?: 'WhatsAppInVideoMessage' };

type FtWidgetParts_WhatsAppOutAudioMessage_Fragment = { __typename?: 'WhatsAppOutAudioMessage' };

type FtWidgetParts_WhatsAppOutDocumentMessage_Fragment = { __typename?: 'WhatsAppOutDocumentMessage' };

type FtWidgetParts_WhatsAppOutImageMessage_Fragment = { __typename?: 'WhatsAppOutImageMessage' };

type FtWidgetParts_WhatsAppOutListMessage_Fragment = { __typename?: 'WhatsAppOutListMessage' };

type FtWidgetParts_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppOutMediaPlaceholderMessage' };

type FtWidgetParts_WhatsAppOutTemplateMessage_Fragment = { __typename?: 'WhatsAppOutTemplateMessage' };

type FtWidgetParts_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename?: 'WhatsAppOutTextAndButtonsMessage' };

type FtWidgetParts_WhatsAppOutTextAndUrlMessage_Fragment = { __typename?: 'WhatsAppOutTextAndURLMessage' };

type FtWidgetParts_WhatsAppOutTextMessage_Fragment = { __typename?: 'WhatsAppOutTextMessage' };

type FtWidgetParts_WhatsAppOutUnknownMessage_Fragment = { __typename?: 'WhatsAppOutUnknownMessage' };

type FtWidgetParts_WhatsAppOutVideoMessage_Fragment = { __typename?: 'WhatsAppOutVideoMessage' };

export type FtWidgetPartsFragment = FtWidgetParts_FacebookInAudioMessage_Fragment | FtWidgetParts_FacebookInFileMessage_Fragment | FtWidgetParts_FacebookInImageMessage_Fragment | FtWidgetParts_FacebookInPostCommentMessage_Fragment | FtWidgetParts_FacebookInTextMessage_Fragment | FtWidgetParts_FacebookInUnknownMessage_Fragment | FtWidgetParts_FacebookInVideoMessage_Fragment | FtWidgetParts_FacebookOutAudioMessage_Fragment | FtWidgetParts_FacebookOutImageMessage_Fragment | FtWidgetParts_FacebookOutPublicCommentReplyMessage_Fragment | FtWidgetParts_FacebookOutTextMessage_Fragment | FtWidgetParts_FacebookOutUnknownMessage_Fragment | FtWidgetParts_FacebookOutVideoMessage_Fragment | FtWidgetParts_InstagramInAdCommentMessage_Fragment | FtWidgetParts_InstagramInAudioMessage_Fragment | FtWidgetParts_InstagramInFeedCommentMessage_Fragment | FtWidgetParts_InstagramInImageMessage_Fragment | FtWidgetParts_InstagramInReelCommentMessage_Fragment | FtWidgetParts_InstagramInStoryReplyMessage_Fragment | FtWidgetParts_InstagramInTextMessage_Fragment | FtWidgetParts_InstagramInUnknownMessage_Fragment | FtWidgetParts_InstagramInVideoMessage_Fragment | FtWidgetParts_InstagramOutAudioMessage_Fragment | FtWidgetParts_InstagramOutImageMessage_Fragment | FtWidgetParts_InstagramOutPublicCommentReplyMessage_Fragment | FtWidgetParts_InstagramOutTextMessage_Fragment | FtWidgetParts_InstagramOutUnknownMessage_Fragment | FtWidgetParts_InstagramOutVideoMessage_Fragment | FtWidgetParts_SystemConversationSummaryMessage_Fragment | FtWidgetParts_SystemLivechatClosedByAutoClosingMessage_Fragment | FtWidgetParts_SystemLivechatOpenedByBooking_Fragment | FtWidgetParts_SystemLivechatOpenedByCoexMessage_Fragment | FtWidgetParts_SystemLivechatOpenedByComponentMessage_Fragment | FtWidgetParts_SystemLivechatOpenedByFacebookAppMessage_Fragment | FtWidgetParts_SystemLivechatOpenedByInstagramAppMessage_Fragment | FtWidgetParts_SystemLivechatOpenedByTikTokAppMessage_Fragment | FtWidgetParts_SystemLivechatOpenedManuallyMessage_Fragment | FtWidgetParts_SystemMetaConversionEventSentMessage_Fragment | FtWidgetParts_SystemTypingMessage_Fragment | FtWidgetParts_TikTokInImageMessage_Fragment | FtWidgetParts_TikTokInTextMessage_Fragment | FtWidgetParts_TikTokInTextPostCommentMessage_Fragment | FtWidgetParts_TikTokInUnknownMessage_Fragment | FtWidgetParts_TikTokOutImageMessage_Fragment | FtWidgetParts_TikTokOutPublicCommentReplyMessage_Fragment | FtWidgetParts_TikTokOutTextMessage_Fragment | FtWidgetParts_TikTokOutUnknownMessage_Fragment | FtWidgetParts_WebWidgetAttachmentMessage_Fragment | FtWidgetParts_WebWidgetCallPhoneButtonClickMessage_Fragment | FtWidgetParts_WebWidgetContinueFlowButtonClickMessage_Fragment | FtWidgetParts_WebWidgetOpenUrlButtonClickMessage_Fragment | FtWidgetParts_WebWidgetTextAndButtonsMessage_Fragment | FtWidgetParts_WebWidgetTextMessage_Fragment | FtWidgetParts_WhatsAppInAudioMessage_Fragment | FtWidgetParts_WhatsAppInContinueFlowButtonClickMessage_Fragment | FtWidgetParts_WhatsAppInDocumentMessage_Fragment | FtWidgetParts_WhatsAppInImageMessage_Fragment | FtWidgetParts_WhatsAppInListRowClickMessage_Fragment | FtWidgetParts_WhatsAppInMediaPlaceholderMessage_Fragment | FtWidgetParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | FtWidgetParts_WhatsAppInTextMessage_Fragment | FtWidgetParts_WhatsAppInUnknownMessage_Fragment | FtWidgetParts_WhatsAppInVideoMessage_Fragment | FtWidgetParts_WhatsAppOutAudioMessage_Fragment | FtWidgetParts_WhatsAppOutDocumentMessage_Fragment | FtWidgetParts_WhatsAppOutImageMessage_Fragment | FtWidgetParts_WhatsAppOutListMessage_Fragment | FtWidgetParts_WhatsAppOutMediaPlaceholderMessage_Fragment | FtWidgetParts_WhatsAppOutTemplateMessage_Fragment | FtWidgetParts_WhatsAppOutTextAndButtonsMessage_Fragment | FtWidgetParts_WhatsAppOutTextAndUrlMessage_Fragment | FtWidgetParts_WhatsAppOutTextMessage_Fragment | FtWidgetParts_WhatsAppOutUnknownMessage_Fragment | FtWidgetParts_WhatsAppOutVideoMessage_Fragment;

type FtOtherPlatformParts_FacebookInAudioMessage_Fragment = { __typename?: 'FacebookInAudioMessage' };

type FtOtherPlatformParts_FacebookInFileMessage_Fragment = { __typename?: 'FacebookInFileMessage' };

type FtOtherPlatformParts_FacebookInImageMessage_Fragment = { __typename?: 'FacebookInImageMessage' };

type FtOtherPlatformParts_FacebookInPostCommentMessage_Fragment = { __typename?: 'FacebookInPostCommentMessage' };

type FtOtherPlatformParts_FacebookInTextMessage_Fragment = { __typename?: 'FacebookInTextMessage', text: string };

type FtOtherPlatformParts_FacebookInUnknownMessage_Fragment = { __typename?: 'FacebookInUnknownMessage' };

type FtOtherPlatformParts_FacebookInVideoMessage_Fragment = { __typename?: 'FacebookInVideoMessage' };

type FtOtherPlatformParts_FacebookOutAudioMessage_Fragment = { __typename?: 'FacebookOutAudioMessage' };

type FtOtherPlatformParts_FacebookOutImageMessage_Fragment = { __typename?: 'FacebookOutImageMessage' };

type FtOtherPlatformParts_FacebookOutPublicCommentReplyMessage_Fragment = { __typename?: 'FacebookOutPublicCommentReplyMessage' };

type FtOtherPlatformParts_FacebookOutTextMessage_Fragment = { __typename?: 'FacebookOutTextMessage', text: string };

type FtOtherPlatformParts_FacebookOutUnknownMessage_Fragment = { __typename?: 'FacebookOutUnknownMessage' };

type FtOtherPlatformParts_FacebookOutVideoMessage_Fragment = { __typename?: 'FacebookOutVideoMessage' };

type FtOtherPlatformParts_InstagramInAdCommentMessage_Fragment = { __typename?: 'InstagramInAdCommentMessage' };

type FtOtherPlatformParts_InstagramInAudioMessage_Fragment = { __typename?: 'InstagramInAudioMessage' };

type FtOtherPlatformParts_InstagramInFeedCommentMessage_Fragment = { __typename?: 'InstagramInFeedCommentMessage' };

type FtOtherPlatformParts_InstagramInImageMessage_Fragment = { __typename?: 'InstagramInImageMessage' };

type FtOtherPlatformParts_InstagramInReelCommentMessage_Fragment = { __typename?: 'InstagramInReelCommentMessage' };

type FtOtherPlatformParts_InstagramInStoryReplyMessage_Fragment = { __typename?: 'InstagramInStoryReplyMessage' };

type FtOtherPlatformParts_InstagramInTextMessage_Fragment = { __typename?: 'InstagramInTextMessage', text: string };

type FtOtherPlatformParts_InstagramInUnknownMessage_Fragment = { __typename?: 'InstagramInUnknownMessage' };

type FtOtherPlatformParts_InstagramInVideoMessage_Fragment = { __typename?: 'InstagramInVideoMessage' };

type FtOtherPlatformParts_InstagramOutAudioMessage_Fragment = { __typename?: 'InstagramOutAudioMessage' };

type FtOtherPlatformParts_InstagramOutImageMessage_Fragment = { __typename?: 'InstagramOutImageMessage' };

type FtOtherPlatformParts_InstagramOutPublicCommentReplyMessage_Fragment = { __typename?: 'InstagramOutPublicCommentReplyMessage' };

type FtOtherPlatformParts_InstagramOutTextMessage_Fragment = { __typename?: 'InstagramOutTextMessage', text: string };

type FtOtherPlatformParts_InstagramOutUnknownMessage_Fragment = { __typename?: 'InstagramOutUnknownMessage' };

type FtOtherPlatformParts_InstagramOutVideoMessage_Fragment = { __typename?: 'InstagramOutVideoMessage' };

type FtOtherPlatformParts_SystemConversationSummaryMessage_Fragment = { __typename?: 'SystemConversationSummaryMessage' };

type FtOtherPlatformParts_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename?: 'SystemLivechatClosedByAutoClosingMessage' };

type FtOtherPlatformParts_SystemLivechatOpenedByBooking_Fragment = { __typename?: 'SystemLivechatOpenedByBooking' };

type FtOtherPlatformParts_SystemLivechatOpenedByCoexMessage_Fragment = { __typename?: 'SystemLivechatOpenedByCoexMessage' };

type FtOtherPlatformParts_SystemLivechatOpenedByComponentMessage_Fragment = { __typename?: 'SystemLivechatOpenedByComponentMessage' };

type FtOtherPlatformParts_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' };

type FtOtherPlatformParts_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' };

type FtOtherPlatformParts_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' };

type FtOtherPlatformParts_SystemLivechatOpenedManuallyMessage_Fragment = { __typename?: 'SystemLivechatOpenedManuallyMessage' };

type FtOtherPlatformParts_SystemMetaConversionEventSentMessage_Fragment = { __typename?: 'SystemMetaConversionEventSentMessage' };

type FtOtherPlatformParts_SystemTypingMessage_Fragment = { __typename?: 'SystemTypingMessage' };

type FtOtherPlatformParts_TikTokInImageMessage_Fragment = { __typename?: 'TikTokInImageMessage' };

type FtOtherPlatformParts_TikTokInTextMessage_Fragment = { __typename?: 'TikTokInTextMessage', text: string };

type FtOtherPlatformParts_TikTokInTextPostCommentMessage_Fragment = { __typename?: 'TikTokInTextPostCommentMessage' };

type FtOtherPlatformParts_TikTokInUnknownMessage_Fragment = { __typename?: 'TikTokInUnknownMessage' };

type FtOtherPlatformParts_TikTokOutImageMessage_Fragment = { __typename?: 'TikTokOutImageMessage' };

type FtOtherPlatformParts_TikTokOutPublicCommentReplyMessage_Fragment = { __typename?: 'TikTokOutPublicCommentReplyMessage' };

type FtOtherPlatformParts_TikTokOutTextMessage_Fragment = { __typename?: 'TikTokOutTextMessage', text: string };

type FtOtherPlatformParts_TikTokOutUnknownMessage_Fragment = { __typename?: 'TikTokOutUnknownMessage' };

type FtOtherPlatformParts_WebWidgetAttachmentMessage_Fragment = { __typename?: 'WebWidgetAttachmentMessage' };

type FtOtherPlatformParts_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename?: 'WebWidgetCallPhoneButtonClickMessage' };

type FtOtherPlatformParts_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename?: 'WebWidgetContinueFlowButtonClickMessage' };

type FtOtherPlatformParts_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename?: 'WebWidgetOpenURLButtonClickMessage' };

type FtOtherPlatformParts_WebWidgetTextAndButtonsMessage_Fragment = { __typename?: 'WebWidgetTextAndButtonsMessage' };

type FtOtherPlatformParts_WebWidgetTextMessage_Fragment = { __typename?: 'WebWidgetTextMessage' };

type FtOtherPlatformParts_WhatsAppInAudioMessage_Fragment = { __typename?: 'WhatsAppInAudioMessage' };

type FtOtherPlatformParts_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' };

type FtOtherPlatformParts_WhatsAppInDocumentMessage_Fragment = { __typename?: 'WhatsAppInDocumentMessage' };

type FtOtherPlatformParts_WhatsAppInImageMessage_Fragment = { __typename?: 'WhatsAppInImageMessage' };

type FtOtherPlatformParts_WhatsAppInListRowClickMessage_Fragment = { __typename?: 'WhatsAppInListRowClickMessage' };

type FtOtherPlatformParts_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppInMediaPlaceholderMessage' };

type FtOtherPlatformParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' };

type FtOtherPlatformParts_WhatsAppInTextMessage_Fragment = { __typename?: 'WhatsAppInTextMessage' };

type FtOtherPlatformParts_WhatsAppInUnknownMessage_Fragment = { __typename?: 'WhatsAppInUnknownMessage' };

type FtOtherPlatformParts_WhatsAppInVideoMessage_Fragment = { __typename?: 'WhatsAppInVideoMessage' };

type FtOtherPlatformParts_WhatsAppOutAudioMessage_Fragment = { __typename?: 'WhatsAppOutAudioMessage' };

type FtOtherPlatformParts_WhatsAppOutDocumentMessage_Fragment = { __typename?: 'WhatsAppOutDocumentMessage' };

type FtOtherPlatformParts_WhatsAppOutImageMessage_Fragment = { __typename?: 'WhatsAppOutImageMessage' };

type FtOtherPlatformParts_WhatsAppOutListMessage_Fragment = { __typename?: 'WhatsAppOutListMessage' };

type FtOtherPlatformParts_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppOutMediaPlaceholderMessage' };

type FtOtherPlatformParts_WhatsAppOutTemplateMessage_Fragment = { __typename?: 'WhatsAppOutTemplateMessage' };

type FtOtherPlatformParts_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename?: 'WhatsAppOutTextAndButtonsMessage' };

type FtOtherPlatformParts_WhatsAppOutTextAndUrlMessage_Fragment = { __typename?: 'WhatsAppOutTextAndURLMessage' };

type FtOtherPlatformParts_WhatsAppOutTextMessage_Fragment = { __typename?: 'WhatsAppOutTextMessage' };

type FtOtherPlatformParts_WhatsAppOutUnknownMessage_Fragment = { __typename?: 'WhatsAppOutUnknownMessage' };

type FtOtherPlatformParts_WhatsAppOutVideoMessage_Fragment = { __typename?: 'WhatsAppOutVideoMessage' };

export type FtOtherPlatformPartsFragment = FtOtherPlatformParts_FacebookInAudioMessage_Fragment | FtOtherPlatformParts_FacebookInFileMessage_Fragment | FtOtherPlatformParts_FacebookInImageMessage_Fragment | FtOtherPlatformParts_FacebookInPostCommentMessage_Fragment | FtOtherPlatformParts_FacebookInTextMessage_Fragment | FtOtherPlatformParts_FacebookInUnknownMessage_Fragment | FtOtherPlatformParts_FacebookInVideoMessage_Fragment | FtOtherPlatformParts_FacebookOutAudioMessage_Fragment | FtOtherPlatformParts_FacebookOutImageMessage_Fragment | FtOtherPlatformParts_FacebookOutPublicCommentReplyMessage_Fragment | FtOtherPlatformParts_FacebookOutTextMessage_Fragment | FtOtherPlatformParts_FacebookOutUnknownMessage_Fragment | FtOtherPlatformParts_FacebookOutVideoMessage_Fragment | FtOtherPlatformParts_InstagramInAdCommentMessage_Fragment | FtOtherPlatformParts_InstagramInAudioMessage_Fragment | FtOtherPlatformParts_InstagramInFeedCommentMessage_Fragment | FtOtherPlatformParts_InstagramInImageMessage_Fragment | FtOtherPlatformParts_InstagramInReelCommentMessage_Fragment | FtOtherPlatformParts_InstagramInStoryReplyMessage_Fragment | FtOtherPlatformParts_InstagramInTextMessage_Fragment | FtOtherPlatformParts_InstagramInUnknownMessage_Fragment | FtOtherPlatformParts_InstagramInVideoMessage_Fragment | FtOtherPlatformParts_InstagramOutAudioMessage_Fragment | FtOtherPlatformParts_InstagramOutImageMessage_Fragment | FtOtherPlatformParts_InstagramOutPublicCommentReplyMessage_Fragment | FtOtherPlatformParts_InstagramOutTextMessage_Fragment | FtOtherPlatformParts_InstagramOutUnknownMessage_Fragment | FtOtherPlatformParts_InstagramOutVideoMessage_Fragment | FtOtherPlatformParts_SystemConversationSummaryMessage_Fragment | FtOtherPlatformParts_SystemLivechatClosedByAutoClosingMessage_Fragment | FtOtherPlatformParts_SystemLivechatOpenedByBooking_Fragment | FtOtherPlatformParts_SystemLivechatOpenedByCoexMessage_Fragment | FtOtherPlatformParts_SystemLivechatOpenedByComponentMessage_Fragment | FtOtherPlatformParts_SystemLivechatOpenedByFacebookAppMessage_Fragment | FtOtherPlatformParts_SystemLivechatOpenedByInstagramAppMessage_Fragment | FtOtherPlatformParts_SystemLivechatOpenedByTikTokAppMessage_Fragment | FtOtherPlatformParts_SystemLivechatOpenedManuallyMessage_Fragment | FtOtherPlatformParts_SystemMetaConversionEventSentMessage_Fragment | FtOtherPlatformParts_SystemTypingMessage_Fragment | FtOtherPlatformParts_TikTokInImageMessage_Fragment | FtOtherPlatformParts_TikTokInTextMessage_Fragment | FtOtherPlatformParts_TikTokInTextPostCommentMessage_Fragment | FtOtherPlatformParts_TikTokInUnknownMessage_Fragment | FtOtherPlatformParts_TikTokOutImageMessage_Fragment | FtOtherPlatformParts_TikTokOutPublicCommentReplyMessage_Fragment | FtOtherPlatformParts_TikTokOutTextMessage_Fragment | FtOtherPlatformParts_TikTokOutUnknownMessage_Fragment | FtOtherPlatformParts_WebWidgetAttachmentMessage_Fragment | FtOtherPlatformParts_WebWidgetCallPhoneButtonClickMessage_Fragment | FtOtherPlatformParts_WebWidgetContinueFlowButtonClickMessage_Fragment | FtOtherPlatformParts_WebWidgetOpenUrlButtonClickMessage_Fragment | FtOtherPlatformParts_WebWidgetTextAndButtonsMessage_Fragment | FtOtherPlatformParts_WebWidgetTextMessage_Fragment | FtOtherPlatformParts_WhatsAppInAudioMessage_Fragment | FtOtherPlatformParts_WhatsAppInContinueFlowButtonClickMessage_Fragment | FtOtherPlatformParts_WhatsAppInDocumentMessage_Fragment | FtOtherPlatformParts_WhatsAppInImageMessage_Fragment | FtOtherPlatformParts_WhatsAppInListRowClickMessage_Fragment | FtOtherPlatformParts_WhatsAppInMediaPlaceholderMessage_Fragment | FtOtherPlatformParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | FtOtherPlatformParts_WhatsAppInTextMessage_Fragment | FtOtherPlatformParts_WhatsAppInUnknownMessage_Fragment | FtOtherPlatformParts_WhatsAppInVideoMessage_Fragment | FtOtherPlatformParts_WhatsAppOutAudioMessage_Fragment | FtOtherPlatformParts_WhatsAppOutDocumentMessage_Fragment | FtOtherPlatformParts_WhatsAppOutImageMessage_Fragment | FtOtherPlatformParts_WhatsAppOutListMessage_Fragment | FtOtherPlatformParts_WhatsAppOutMediaPlaceholderMessage_Fragment | FtOtherPlatformParts_WhatsAppOutTemplateMessage_Fragment | FtOtherPlatformParts_WhatsAppOutTextAndButtonsMessage_Fragment | FtOtherPlatformParts_WhatsAppOutTextAndUrlMessage_Fragment | FtOtherPlatformParts_WhatsAppOutTextMessage_Fragment | FtOtherPlatformParts_WhatsAppOutUnknownMessage_Fragment | FtOtherPlatformParts_WhatsAppOutVideoMessage_Fragment;

type FtSystemParts_FacebookInAudioMessage_Fragment = { __typename?: 'FacebookInAudioMessage' };

type FtSystemParts_FacebookInFileMessage_Fragment = { __typename?: 'FacebookInFileMessage' };

type FtSystemParts_FacebookInImageMessage_Fragment = { __typename?: 'FacebookInImageMessage' };

type FtSystemParts_FacebookInPostCommentMessage_Fragment = { __typename?: 'FacebookInPostCommentMessage' };

type FtSystemParts_FacebookInTextMessage_Fragment = { __typename?: 'FacebookInTextMessage' };

type FtSystemParts_FacebookInUnknownMessage_Fragment = { __typename?: 'FacebookInUnknownMessage' };

type FtSystemParts_FacebookInVideoMessage_Fragment = { __typename?: 'FacebookInVideoMessage' };

type FtSystemParts_FacebookOutAudioMessage_Fragment = { __typename?: 'FacebookOutAudioMessage' };

type FtSystemParts_FacebookOutImageMessage_Fragment = { __typename?: 'FacebookOutImageMessage' };

type FtSystemParts_FacebookOutPublicCommentReplyMessage_Fragment = { __typename?: 'FacebookOutPublicCommentReplyMessage' };

type FtSystemParts_FacebookOutTextMessage_Fragment = { __typename?: 'FacebookOutTextMessage' };

type FtSystemParts_FacebookOutUnknownMessage_Fragment = { __typename?: 'FacebookOutUnknownMessage' };

type FtSystemParts_FacebookOutVideoMessage_Fragment = { __typename?: 'FacebookOutVideoMessage' };

type FtSystemParts_InstagramInAdCommentMessage_Fragment = { __typename?: 'InstagramInAdCommentMessage' };

type FtSystemParts_InstagramInAudioMessage_Fragment = { __typename?: 'InstagramInAudioMessage' };

type FtSystemParts_InstagramInFeedCommentMessage_Fragment = { __typename?: 'InstagramInFeedCommentMessage' };

type FtSystemParts_InstagramInImageMessage_Fragment = { __typename?: 'InstagramInImageMessage' };

type FtSystemParts_InstagramInReelCommentMessage_Fragment = { __typename?: 'InstagramInReelCommentMessage' };

type FtSystemParts_InstagramInStoryReplyMessage_Fragment = { __typename?: 'InstagramInStoryReplyMessage' };

type FtSystemParts_InstagramInTextMessage_Fragment = { __typename?: 'InstagramInTextMessage' };

type FtSystemParts_InstagramInUnknownMessage_Fragment = { __typename?: 'InstagramInUnknownMessage' };

type FtSystemParts_InstagramInVideoMessage_Fragment = { __typename?: 'InstagramInVideoMessage' };

type FtSystemParts_InstagramOutAudioMessage_Fragment = { __typename?: 'InstagramOutAudioMessage' };

type FtSystemParts_InstagramOutImageMessage_Fragment = { __typename?: 'InstagramOutImageMessage' };

type FtSystemParts_InstagramOutPublicCommentReplyMessage_Fragment = { __typename?: 'InstagramOutPublicCommentReplyMessage' };

type FtSystemParts_InstagramOutTextMessage_Fragment = { __typename?: 'InstagramOutTextMessage' };

type FtSystemParts_InstagramOutUnknownMessage_Fragment = { __typename?: 'InstagramOutUnknownMessage' };

type FtSystemParts_InstagramOutVideoMessage_Fragment = { __typename?: 'InstagramOutVideoMessage' };

type FtSystemParts_SystemConversationSummaryMessage_Fragment = { __typename?: 'SystemConversationSummaryMessage', summary: string };

type FtSystemParts_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename?: 'SystemLivechatClosedByAutoClosingMessage' };

type FtSystemParts_SystemLivechatOpenedByBooking_Fragment = { __typename?: 'SystemLivechatOpenedByBooking' };

type FtSystemParts_SystemLivechatOpenedByCoexMessage_Fragment = { __typename?: 'SystemLivechatOpenedByCoexMessage' };

type FtSystemParts_SystemLivechatOpenedByComponentMessage_Fragment = { __typename?: 'SystemLivechatOpenedByComponentMessage', originallyDecidedByAI: boolean };

type FtSystemParts_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' };

type FtSystemParts_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' };

type FtSystemParts_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' };

type FtSystemParts_SystemLivechatOpenedManuallyMessage_Fragment = { __typename?: 'SystemLivechatOpenedManuallyMessage' };

type FtSystemParts_SystemMetaConversionEventSentMessage_Fragment = { __typename?: 'SystemMetaConversionEventSentMessage' };

type FtSystemParts_SystemTypingMessage_Fragment = { __typename?: 'SystemTypingMessage', until: string };

type FtSystemParts_TikTokInImageMessage_Fragment = { __typename?: 'TikTokInImageMessage' };

type FtSystemParts_TikTokInTextMessage_Fragment = { __typename?: 'TikTokInTextMessage' };

type FtSystemParts_TikTokInTextPostCommentMessage_Fragment = { __typename?: 'TikTokInTextPostCommentMessage' };

type FtSystemParts_TikTokInUnknownMessage_Fragment = { __typename?: 'TikTokInUnknownMessage' };

type FtSystemParts_TikTokOutImageMessage_Fragment = { __typename?: 'TikTokOutImageMessage' };

type FtSystemParts_TikTokOutPublicCommentReplyMessage_Fragment = { __typename?: 'TikTokOutPublicCommentReplyMessage' };

type FtSystemParts_TikTokOutTextMessage_Fragment = { __typename?: 'TikTokOutTextMessage' };

type FtSystemParts_TikTokOutUnknownMessage_Fragment = { __typename?: 'TikTokOutUnknownMessage' };

type FtSystemParts_WebWidgetAttachmentMessage_Fragment = { __typename?: 'WebWidgetAttachmentMessage' };

type FtSystemParts_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename?: 'WebWidgetCallPhoneButtonClickMessage' };

type FtSystemParts_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename?: 'WebWidgetContinueFlowButtonClickMessage' };

type FtSystemParts_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename?: 'WebWidgetOpenURLButtonClickMessage' };

type FtSystemParts_WebWidgetTextAndButtonsMessage_Fragment = { __typename?: 'WebWidgetTextAndButtonsMessage' };

type FtSystemParts_WebWidgetTextMessage_Fragment = { __typename?: 'WebWidgetTextMessage' };

type FtSystemParts_WhatsAppInAudioMessage_Fragment = { __typename?: 'WhatsAppInAudioMessage' };

type FtSystemParts_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' };

type FtSystemParts_WhatsAppInDocumentMessage_Fragment = { __typename?: 'WhatsAppInDocumentMessage' };

type FtSystemParts_WhatsAppInImageMessage_Fragment = { __typename?: 'WhatsAppInImageMessage' };

type FtSystemParts_WhatsAppInListRowClickMessage_Fragment = { __typename?: 'WhatsAppInListRowClickMessage' };

type FtSystemParts_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppInMediaPlaceholderMessage' };

type FtSystemParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' };

type FtSystemParts_WhatsAppInTextMessage_Fragment = { __typename?: 'WhatsAppInTextMessage' };

type FtSystemParts_WhatsAppInUnknownMessage_Fragment = { __typename?: 'WhatsAppInUnknownMessage' };

type FtSystemParts_WhatsAppInVideoMessage_Fragment = { __typename?: 'WhatsAppInVideoMessage' };

type FtSystemParts_WhatsAppOutAudioMessage_Fragment = { __typename?: 'WhatsAppOutAudioMessage' };

type FtSystemParts_WhatsAppOutDocumentMessage_Fragment = { __typename?: 'WhatsAppOutDocumentMessage' };

type FtSystemParts_WhatsAppOutImageMessage_Fragment = { __typename?: 'WhatsAppOutImageMessage' };

type FtSystemParts_WhatsAppOutListMessage_Fragment = { __typename?: 'WhatsAppOutListMessage' };

type FtSystemParts_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename?: 'WhatsAppOutMediaPlaceholderMessage' };

type FtSystemParts_WhatsAppOutTemplateMessage_Fragment = { __typename?: 'WhatsAppOutTemplateMessage' };

type FtSystemParts_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename?: 'WhatsAppOutTextAndButtonsMessage' };

type FtSystemParts_WhatsAppOutTextAndUrlMessage_Fragment = { __typename?: 'WhatsAppOutTextAndURLMessage' };

type FtSystemParts_WhatsAppOutTextMessage_Fragment = { __typename?: 'WhatsAppOutTextMessage' };

type FtSystemParts_WhatsAppOutUnknownMessage_Fragment = { __typename?: 'WhatsAppOutUnknownMessage' };

type FtSystemParts_WhatsAppOutVideoMessage_Fragment = { __typename?: 'WhatsAppOutVideoMessage' };

export type FtSystemPartsFragment = FtSystemParts_FacebookInAudioMessage_Fragment | FtSystemParts_FacebookInFileMessage_Fragment | FtSystemParts_FacebookInImageMessage_Fragment | FtSystemParts_FacebookInPostCommentMessage_Fragment | FtSystemParts_FacebookInTextMessage_Fragment | FtSystemParts_FacebookInUnknownMessage_Fragment | FtSystemParts_FacebookInVideoMessage_Fragment | FtSystemParts_FacebookOutAudioMessage_Fragment | FtSystemParts_FacebookOutImageMessage_Fragment | FtSystemParts_FacebookOutPublicCommentReplyMessage_Fragment | FtSystemParts_FacebookOutTextMessage_Fragment | FtSystemParts_FacebookOutUnknownMessage_Fragment | FtSystemParts_FacebookOutVideoMessage_Fragment | FtSystemParts_InstagramInAdCommentMessage_Fragment | FtSystemParts_InstagramInAudioMessage_Fragment | FtSystemParts_InstagramInFeedCommentMessage_Fragment | FtSystemParts_InstagramInImageMessage_Fragment | FtSystemParts_InstagramInReelCommentMessage_Fragment | FtSystemParts_InstagramInStoryReplyMessage_Fragment | FtSystemParts_InstagramInTextMessage_Fragment | FtSystemParts_InstagramInUnknownMessage_Fragment | FtSystemParts_InstagramInVideoMessage_Fragment | FtSystemParts_InstagramOutAudioMessage_Fragment | FtSystemParts_InstagramOutImageMessage_Fragment | FtSystemParts_InstagramOutPublicCommentReplyMessage_Fragment | FtSystemParts_InstagramOutTextMessage_Fragment | FtSystemParts_InstagramOutUnknownMessage_Fragment | FtSystemParts_InstagramOutVideoMessage_Fragment | FtSystemParts_SystemConversationSummaryMessage_Fragment | FtSystemParts_SystemLivechatClosedByAutoClosingMessage_Fragment | FtSystemParts_SystemLivechatOpenedByBooking_Fragment | FtSystemParts_SystemLivechatOpenedByCoexMessage_Fragment | FtSystemParts_SystemLivechatOpenedByComponentMessage_Fragment | FtSystemParts_SystemLivechatOpenedByFacebookAppMessage_Fragment | FtSystemParts_SystemLivechatOpenedByInstagramAppMessage_Fragment | FtSystemParts_SystemLivechatOpenedByTikTokAppMessage_Fragment | FtSystemParts_SystemLivechatOpenedManuallyMessage_Fragment | FtSystemParts_SystemMetaConversionEventSentMessage_Fragment | FtSystemParts_SystemTypingMessage_Fragment | FtSystemParts_TikTokInImageMessage_Fragment | FtSystemParts_TikTokInTextMessage_Fragment | FtSystemParts_TikTokInTextPostCommentMessage_Fragment | FtSystemParts_TikTokInUnknownMessage_Fragment | FtSystemParts_TikTokOutImageMessage_Fragment | FtSystemParts_TikTokOutPublicCommentReplyMessage_Fragment | FtSystemParts_TikTokOutTextMessage_Fragment | FtSystemParts_TikTokOutUnknownMessage_Fragment | FtSystemParts_WebWidgetAttachmentMessage_Fragment | FtSystemParts_WebWidgetCallPhoneButtonClickMessage_Fragment | FtSystemParts_WebWidgetContinueFlowButtonClickMessage_Fragment | FtSystemParts_WebWidgetOpenUrlButtonClickMessage_Fragment | FtSystemParts_WebWidgetTextAndButtonsMessage_Fragment | FtSystemParts_WebWidgetTextMessage_Fragment | FtSystemParts_WhatsAppInAudioMessage_Fragment | FtSystemParts_WhatsAppInContinueFlowButtonClickMessage_Fragment | FtSystemParts_WhatsAppInDocumentMessage_Fragment | FtSystemParts_WhatsAppInImageMessage_Fragment | FtSystemParts_WhatsAppInListRowClickMessage_Fragment | FtSystemParts_WhatsAppInMediaPlaceholderMessage_Fragment | FtSystemParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | FtSystemParts_WhatsAppInTextMessage_Fragment | FtSystemParts_WhatsAppInUnknownMessage_Fragment | FtSystemParts_WhatsAppInVideoMessage_Fragment | FtSystemParts_WhatsAppOutAudioMessage_Fragment | FtSystemParts_WhatsAppOutDocumentMessage_Fragment | FtSystemParts_WhatsAppOutImageMessage_Fragment | FtSystemParts_WhatsAppOutListMessage_Fragment | FtSystemParts_WhatsAppOutMediaPlaceholderMessage_Fragment | FtSystemParts_WhatsAppOutTemplateMessage_Fragment | FtSystemParts_WhatsAppOutTextAndButtonsMessage_Fragment | FtSystemParts_WhatsAppOutTextAndUrlMessage_Fragment | FtSystemParts_WhatsAppOutTextMessage_Fragment | FtSystemParts_WhatsAppOutUnknownMessage_Fragment | FtSystemParts_WhatsAppOutVideoMessage_Fragment;

type FtMessageParts_FacebookInAudioMessage_Fragment = (
  { __typename?: 'FacebookInAudioMessage' }
  & FtMessageCommon_FacebookInAudioMessage_Fragment
  & FtWhatsAppParts_FacebookInAudioMessage_Fragment
  & FtWidgetParts_FacebookInAudioMessage_Fragment
  & FtOtherPlatformParts_FacebookInAudioMessage_Fragment
  & FtSystemParts_FacebookInAudioMessage_Fragment
);

type FtMessageParts_FacebookInFileMessage_Fragment = (
  { __typename?: 'FacebookInFileMessage' }
  & FtMessageCommon_FacebookInFileMessage_Fragment
  & FtWhatsAppParts_FacebookInFileMessage_Fragment
  & FtWidgetParts_FacebookInFileMessage_Fragment
  & FtOtherPlatformParts_FacebookInFileMessage_Fragment
  & FtSystemParts_FacebookInFileMessage_Fragment
);

type FtMessageParts_FacebookInImageMessage_Fragment = (
  { __typename?: 'FacebookInImageMessage' }
  & FtMessageCommon_FacebookInImageMessage_Fragment
  & FtWhatsAppParts_FacebookInImageMessage_Fragment
  & FtWidgetParts_FacebookInImageMessage_Fragment
  & FtOtherPlatformParts_FacebookInImageMessage_Fragment
  & FtSystemParts_FacebookInImageMessage_Fragment
);

type FtMessageParts_FacebookInPostCommentMessage_Fragment = (
  { __typename?: 'FacebookInPostCommentMessage' }
  & FtMessageCommon_FacebookInPostCommentMessage_Fragment
  & FtWhatsAppParts_FacebookInPostCommentMessage_Fragment
  & FtWidgetParts_FacebookInPostCommentMessage_Fragment
  & FtOtherPlatformParts_FacebookInPostCommentMessage_Fragment
  & FtSystemParts_FacebookInPostCommentMessage_Fragment
);

type FtMessageParts_FacebookInTextMessage_Fragment = (
  { __typename?: 'FacebookInTextMessage' }
  & FtMessageCommon_FacebookInTextMessage_Fragment
  & FtWhatsAppParts_FacebookInTextMessage_Fragment
  & FtWidgetParts_FacebookInTextMessage_Fragment
  & FtOtherPlatformParts_FacebookInTextMessage_Fragment
  & FtSystemParts_FacebookInTextMessage_Fragment
);

type FtMessageParts_FacebookInUnknownMessage_Fragment = (
  { __typename?: 'FacebookInUnknownMessage' }
  & FtMessageCommon_FacebookInUnknownMessage_Fragment
  & FtWhatsAppParts_FacebookInUnknownMessage_Fragment
  & FtWidgetParts_FacebookInUnknownMessage_Fragment
  & FtOtherPlatformParts_FacebookInUnknownMessage_Fragment
  & FtSystemParts_FacebookInUnknownMessage_Fragment
);

type FtMessageParts_FacebookInVideoMessage_Fragment = (
  { __typename?: 'FacebookInVideoMessage' }
  & FtMessageCommon_FacebookInVideoMessage_Fragment
  & FtWhatsAppParts_FacebookInVideoMessage_Fragment
  & FtWidgetParts_FacebookInVideoMessage_Fragment
  & FtOtherPlatformParts_FacebookInVideoMessage_Fragment
  & FtSystemParts_FacebookInVideoMessage_Fragment
);

type FtMessageParts_FacebookOutAudioMessage_Fragment = (
  { __typename?: 'FacebookOutAudioMessage' }
  & FtMessageCommon_FacebookOutAudioMessage_Fragment
  & FtWhatsAppParts_FacebookOutAudioMessage_Fragment
  & FtWidgetParts_FacebookOutAudioMessage_Fragment
  & FtOtherPlatformParts_FacebookOutAudioMessage_Fragment
  & FtSystemParts_FacebookOutAudioMessage_Fragment
);

type FtMessageParts_FacebookOutImageMessage_Fragment = (
  { __typename?: 'FacebookOutImageMessage' }
  & FtMessageCommon_FacebookOutImageMessage_Fragment
  & FtWhatsAppParts_FacebookOutImageMessage_Fragment
  & FtWidgetParts_FacebookOutImageMessage_Fragment
  & FtOtherPlatformParts_FacebookOutImageMessage_Fragment
  & FtSystemParts_FacebookOutImageMessage_Fragment
);

type FtMessageParts_FacebookOutPublicCommentReplyMessage_Fragment = (
  { __typename?: 'FacebookOutPublicCommentReplyMessage' }
  & FtMessageCommon_FacebookOutPublicCommentReplyMessage_Fragment
  & FtWhatsAppParts_FacebookOutPublicCommentReplyMessage_Fragment
  & FtWidgetParts_FacebookOutPublicCommentReplyMessage_Fragment
  & FtOtherPlatformParts_FacebookOutPublicCommentReplyMessage_Fragment
  & FtSystemParts_FacebookOutPublicCommentReplyMessage_Fragment
);

type FtMessageParts_FacebookOutTextMessage_Fragment = (
  { __typename?: 'FacebookOutTextMessage' }
  & FtMessageCommon_FacebookOutTextMessage_Fragment
  & FtWhatsAppParts_FacebookOutTextMessage_Fragment
  & FtWidgetParts_FacebookOutTextMessage_Fragment
  & FtOtherPlatformParts_FacebookOutTextMessage_Fragment
  & FtSystemParts_FacebookOutTextMessage_Fragment
);

type FtMessageParts_FacebookOutUnknownMessage_Fragment = (
  { __typename?: 'FacebookOutUnknownMessage' }
  & FtMessageCommon_FacebookOutUnknownMessage_Fragment
  & FtWhatsAppParts_FacebookOutUnknownMessage_Fragment
  & FtWidgetParts_FacebookOutUnknownMessage_Fragment
  & FtOtherPlatformParts_FacebookOutUnknownMessage_Fragment
  & FtSystemParts_FacebookOutUnknownMessage_Fragment
);

type FtMessageParts_FacebookOutVideoMessage_Fragment = (
  { __typename?: 'FacebookOutVideoMessage' }
  & FtMessageCommon_FacebookOutVideoMessage_Fragment
  & FtWhatsAppParts_FacebookOutVideoMessage_Fragment
  & FtWidgetParts_FacebookOutVideoMessage_Fragment
  & FtOtherPlatformParts_FacebookOutVideoMessage_Fragment
  & FtSystemParts_FacebookOutVideoMessage_Fragment
);

type FtMessageParts_InstagramInAdCommentMessage_Fragment = (
  { __typename?: 'InstagramInAdCommentMessage' }
  & FtMessageCommon_InstagramInAdCommentMessage_Fragment
  & FtWhatsAppParts_InstagramInAdCommentMessage_Fragment
  & FtWidgetParts_InstagramInAdCommentMessage_Fragment
  & FtOtherPlatformParts_InstagramInAdCommentMessage_Fragment
  & FtSystemParts_InstagramInAdCommentMessage_Fragment
);

type FtMessageParts_InstagramInAudioMessage_Fragment = (
  { __typename?: 'InstagramInAudioMessage' }
  & FtMessageCommon_InstagramInAudioMessage_Fragment
  & FtWhatsAppParts_InstagramInAudioMessage_Fragment
  & FtWidgetParts_InstagramInAudioMessage_Fragment
  & FtOtherPlatformParts_InstagramInAudioMessage_Fragment
  & FtSystemParts_InstagramInAudioMessage_Fragment
);

type FtMessageParts_InstagramInFeedCommentMessage_Fragment = (
  { __typename?: 'InstagramInFeedCommentMessage' }
  & FtMessageCommon_InstagramInFeedCommentMessage_Fragment
  & FtWhatsAppParts_InstagramInFeedCommentMessage_Fragment
  & FtWidgetParts_InstagramInFeedCommentMessage_Fragment
  & FtOtherPlatformParts_InstagramInFeedCommentMessage_Fragment
  & FtSystemParts_InstagramInFeedCommentMessage_Fragment
);

type FtMessageParts_InstagramInImageMessage_Fragment = (
  { __typename?: 'InstagramInImageMessage' }
  & FtMessageCommon_InstagramInImageMessage_Fragment
  & FtWhatsAppParts_InstagramInImageMessage_Fragment
  & FtWidgetParts_InstagramInImageMessage_Fragment
  & FtOtherPlatformParts_InstagramInImageMessage_Fragment
  & FtSystemParts_InstagramInImageMessage_Fragment
);

type FtMessageParts_InstagramInReelCommentMessage_Fragment = (
  { __typename?: 'InstagramInReelCommentMessage' }
  & FtMessageCommon_InstagramInReelCommentMessage_Fragment
  & FtWhatsAppParts_InstagramInReelCommentMessage_Fragment
  & FtWidgetParts_InstagramInReelCommentMessage_Fragment
  & FtOtherPlatformParts_InstagramInReelCommentMessage_Fragment
  & FtSystemParts_InstagramInReelCommentMessage_Fragment
);

type FtMessageParts_InstagramInStoryReplyMessage_Fragment = (
  { __typename?: 'InstagramInStoryReplyMessage' }
  & FtMessageCommon_InstagramInStoryReplyMessage_Fragment
  & FtWhatsAppParts_InstagramInStoryReplyMessage_Fragment
  & FtWidgetParts_InstagramInStoryReplyMessage_Fragment
  & FtOtherPlatformParts_InstagramInStoryReplyMessage_Fragment
  & FtSystemParts_InstagramInStoryReplyMessage_Fragment
);

type FtMessageParts_InstagramInTextMessage_Fragment = (
  { __typename?: 'InstagramInTextMessage' }
  & FtMessageCommon_InstagramInTextMessage_Fragment
  & FtWhatsAppParts_InstagramInTextMessage_Fragment
  & FtWidgetParts_InstagramInTextMessage_Fragment
  & FtOtherPlatformParts_InstagramInTextMessage_Fragment
  & FtSystemParts_InstagramInTextMessage_Fragment
);

type FtMessageParts_InstagramInUnknownMessage_Fragment = (
  { __typename?: 'InstagramInUnknownMessage' }
  & FtMessageCommon_InstagramInUnknownMessage_Fragment
  & FtWhatsAppParts_InstagramInUnknownMessage_Fragment
  & FtWidgetParts_InstagramInUnknownMessage_Fragment
  & FtOtherPlatformParts_InstagramInUnknownMessage_Fragment
  & FtSystemParts_InstagramInUnknownMessage_Fragment
);

type FtMessageParts_InstagramInVideoMessage_Fragment = (
  { __typename?: 'InstagramInVideoMessage' }
  & FtMessageCommon_InstagramInVideoMessage_Fragment
  & FtWhatsAppParts_InstagramInVideoMessage_Fragment
  & FtWidgetParts_InstagramInVideoMessage_Fragment
  & FtOtherPlatformParts_InstagramInVideoMessage_Fragment
  & FtSystemParts_InstagramInVideoMessage_Fragment
);

type FtMessageParts_InstagramOutAudioMessage_Fragment = (
  { __typename?: 'InstagramOutAudioMessage' }
  & FtMessageCommon_InstagramOutAudioMessage_Fragment
  & FtWhatsAppParts_InstagramOutAudioMessage_Fragment
  & FtWidgetParts_InstagramOutAudioMessage_Fragment
  & FtOtherPlatformParts_InstagramOutAudioMessage_Fragment
  & FtSystemParts_InstagramOutAudioMessage_Fragment
);

type FtMessageParts_InstagramOutImageMessage_Fragment = (
  { __typename?: 'InstagramOutImageMessage' }
  & FtMessageCommon_InstagramOutImageMessage_Fragment
  & FtWhatsAppParts_InstagramOutImageMessage_Fragment
  & FtWidgetParts_InstagramOutImageMessage_Fragment
  & FtOtherPlatformParts_InstagramOutImageMessage_Fragment
  & FtSystemParts_InstagramOutImageMessage_Fragment
);

type FtMessageParts_InstagramOutPublicCommentReplyMessage_Fragment = (
  { __typename?: 'InstagramOutPublicCommentReplyMessage' }
  & FtMessageCommon_InstagramOutPublicCommentReplyMessage_Fragment
  & FtWhatsAppParts_InstagramOutPublicCommentReplyMessage_Fragment
  & FtWidgetParts_InstagramOutPublicCommentReplyMessage_Fragment
  & FtOtherPlatformParts_InstagramOutPublicCommentReplyMessage_Fragment
  & FtSystemParts_InstagramOutPublicCommentReplyMessage_Fragment
);

type FtMessageParts_InstagramOutTextMessage_Fragment = (
  { __typename?: 'InstagramOutTextMessage' }
  & FtMessageCommon_InstagramOutTextMessage_Fragment
  & FtWhatsAppParts_InstagramOutTextMessage_Fragment
  & FtWidgetParts_InstagramOutTextMessage_Fragment
  & FtOtherPlatformParts_InstagramOutTextMessage_Fragment
  & FtSystemParts_InstagramOutTextMessage_Fragment
);

type FtMessageParts_InstagramOutUnknownMessage_Fragment = (
  { __typename?: 'InstagramOutUnknownMessage' }
  & FtMessageCommon_InstagramOutUnknownMessage_Fragment
  & FtWhatsAppParts_InstagramOutUnknownMessage_Fragment
  & FtWidgetParts_InstagramOutUnknownMessage_Fragment
  & FtOtherPlatformParts_InstagramOutUnknownMessage_Fragment
  & FtSystemParts_InstagramOutUnknownMessage_Fragment
);

type FtMessageParts_InstagramOutVideoMessage_Fragment = (
  { __typename?: 'InstagramOutVideoMessage' }
  & FtMessageCommon_InstagramOutVideoMessage_Fragment
  & FtWhatsAppParts_InstagramOutVideoMessage_Fragment
  & FtWidgetParts_InstagramOutVideoMessage_Fragment
  & FtOtherPlatformParts_InstagramOutVideoMessage_Fragment
  & FtSystemParts_InstagramOutVideoMessage_Fragment
);

type FtMessageParts_SystemConversationSummaryMessage_Fragment = (
  { __typename?: 'SystemConversationSummaryMessage' }
  & FtMessageCommon_SystemConversationSummaryMessage_Fragment
  & FtWhatsAppParts_SystemConversationSummaryMessage_Fragment
  & FtWidgetParts_SystemConversationSummaryMessage_Fragment
  & FtOtherPlatformParts_SystemConversationSummaryMessage_Fragment
  & FtSystemParts_SystemConversationSummaryMessage_Fragment
);

type FtMessageParts_SystemLivechatClosedByAutoClosingMessage_Fragment = (
  { __typename?: 'SystemLivechatClosedByAutoClosingMessage' }
  & FtMessageCommon_SystemLivechatClosedByAutoClosingMessage_Fragment
  & FtWhatsAppParts_SystemLivechatClosedByAutoClosingMessage_Fragment
  & FtWidgetParts_SystemLivechatClosedByAutoClosingMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatClosedByAutoClosingMessage_Fragment
  & FtSystemParts_SystemLivechatClosedByAutoClosingMessage_Fragment
);

type FtMessageParts_SystemLivechatOpenedByBooking_Fragment = (
  { __typename?: 'SystemLivechatOpenedByBooking' }
  & FtMessageCommon_SystemLivechatOpenedByBooking_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedByBooking_Fragment
  & FtWidgetParts_SystemLivechatOpenedByBooking_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedByBooking_Fragment
  & FtSystemParts_SystemLivechatOpenedByBooking_Fragment
);

type FtMessageParts_SystemLivechatOpenedByCoexMessage_Fragment = (
  { __typename?: 'SystemLivechatOpenedByCoexMessage' }
  & FtMessageCommon_SystemLivechatOpenedByCoexMessage_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedByCoexMessage_Fragment
  & FtWidgetParts_SystemLivechatOpenedByCoexMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedByCoexMessage_Fragment
  & FtSystemParts_SystemLivechatOpenedByCoexMessage_Fragment
);

type FtMessageParts_SystemLivechatOpenedByComponentMessage_Fragment = (
  { __typename?: 'SystemLivechatOpenedByComponentMessage' }
  & FtMessageCommon_SystemLivechatOpenedByComponentMessage_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedByComponentMessage_Fragment
  & FtWidgetParts_SystemLivechatOpenedByComponentMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedByComponentMessage_Fragment
  & FtSystemParts_SystemLivechatOpenedByComponentMessage_Fragment
);

type FtMessageParts_SystemLivechatOpenedByFacebookAppMessage_Fragment = (
  { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' }
  & FtMessageCommon_SystemLivechatOpenedByFacebookAppMessage_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
  & FtWidgetParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
  & FtSystemParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
);

type FtMessageParts_SystemLivechatOpenedByInstagramAppMessage_Fragment = (
  { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' }
  & FtMessageCommon_SystemLivechatOpenedByInstagramAppMessage_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
  & FtWidgetParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
  & FtSystemParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
);

type FtMessageParts_SystemLivechatOpenedByTikTokAppMessage_Fragment = (
  { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' }
  & FtMessageCommon_SystemLivechatOpenedByTikTokAppMessage_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
  & FtWidgetParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
  & FtSystemParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
);

type FtMessageParts_SystemLivechatOpenedManuallyMessage_Fragment = (
  { __typename?: 'SystemLivechatOpenedManuallyMessage' }
  & FtMessageCommon_SystemLivechatOpenedManuallyMessage_Fragment
  & FtWhatsAppParts_SystemLivechatOpenedManuallyMessage_Fragment
  & FtWidgetParts_SystemLivechatOpenedManuallyMessage_Fragment
  & FtOtherPlatformParts_SystemLivechatOpenedManuallyMessage_Fragment
  & FtSystemParts_SystemLivechatOpenedManuallyMessage_Fragment
);

type FtMessageParts_SystemMetaConversionEventSentMessage_Fragment = (
  { __typename?: 'SystemMetaConversionEventSentMessage' }
  & FtMessageCommon_SystemMetaConversionEventSentMessage_Fragment
  & FtWhatsAppParts_SystemMetaConversionEventSentMessage_Fragment
  & FtWidgetParts_SystemMetaConversionEventSentMessage_Fragment
  & FtOtherPlatformParts_SystemMetaConversionEventSentMessage_Fragment
  & FtSystemParts_SystemMetaConversionEventSentMessage_Fragment
);

type FtMessageParts_SystemTypingMessage_Fragment = (
  { __typename?: 'SystemTypingMessage' }
  & FtMessageCommon_SystemTypingMessage_Fragment
  & FtWhatsAppParts_SystemTypingMessage_Fragment
  & FtWidgetParts_SystemTypingMessage_Fragment
  & FtOtherPlatformParts_SystemTypingMessage_Fragment
  & FtSystemParts_SystemTypingMessage_Fragment
);

type FtMessageParts_TikTokInImageMessage_Fragment = (
  { __typename?: 'TikTokInImageMessage' }
  & FtMessageCommon_TikTokInImageMessage_Fragment
  & FtWhatsAppParts_TikTokInImageMessage_Fragment
  & FtWidgetParts_TikTokInImageMessage_Fragment
  & FtOtherPlatformParts_TikTokInImageMessage_Fragment
  & FtSystemParts_TikTokInImageMessage_Fragment
);

type FtMessageParts_TikTokInTextMessage_Fragment = (
  { __typename?: 'TikTokInTextMessage' }
  & FtMessageCommon_TikTokInTextMessage_Fragment
  & FtWhatsAppParts_TikTokInTextMessage_Fragment
  & FtWidgetParts_TikTokInTextMessage_Fragment
  & FtOtherPlatformParts_TikTokInTextMessage_Fragment
  & FtSystemParts_TikTokInTextMessage_Fragment
);

type FtMessageParts_TikTokInTextPostCommentMessage_Fragment = (
  { __typename?: 'TikTokInTextPostCommentMessage' }
  & FtMessageCommon_TikTokInTextPostCommentMessage_Fragment
  & FtWhatsAppParts_TikTokInTextPostCommentMessage_Fragment
  & FtWidgetParts_TikTokInTextPostCommentMessage_Fragment
  & FtOtherPlatformParts_TikTokInTextPostCommentMessage_Fragment
  & FtSystemParts_TikTokInTextPostCommentMessage_Fragment
);

type FtMessageParts_TikTokInUnknownMessage_Fragment = (
  { __typename?: 'TikTokInUnknownMessage' }
  & FtMessageCommon_TikTokInUnknownMessage_Fragment
  & FtWhatsAppParts_TikTokInUnknownMessage_Fragment
  & FtWidgetParts_TikTokInUnknownMessage_Fragment
  & FtOtherPlatformParts_TikTokInUnknownMessage_Fragment
  & FtSystemParts_TikTokInUnknownMessage_Fragment
);

type FtMessageParts_TikTokOutImageMessage_Fragment = (
  { __typename?: 'TikTokOutImageMessage' }
  & FtMessageCommon_TikTokOutImageMessage_Fragment
  & FtWhatsAppParts_TikTokOutImageMessage_Fragment
  & FtWidgetParts_TikTokOutImageMessage_Fragment
  & FtOtherPlatformParts_TikTokOutImageMessage_Fragment
  & FtSystemParts_TikTokOutImageMessage_Fragment
);

type FtMessageParts_TikTokOutPublicCommentReplyMessage_Fragment = (
  { __typename?: 'TikTokOutPublicCommentReplyMessage' }
  & FtMessageCommon_TikTokOutPublicCommentReplyMessage_Fragment
  & FtWhatsAppParts_TikTokOutPublicCommentReplyMessage_Fragment
  & FtWidgetParts_TikTokOutPublicCommentReplyMessage_Fragment
  & FtOtherPlatformParts_TikTokOutPublicCommentReplyMessage_Fragment
  & FtSystemParts_TikTokOutPublicCommentReplyMessage_Fragment
);

type FtMessageParts_TikTokOutTextMessage_Fragment = (
  { __typename?: 'TikTokOutTextMessage' }
  & FtMessageCommon_TikTokOutTextMessage_Fragment
  & FtWhatsAppParts_TikTokOutTextMessage_Fragment
  & FtWidgetParts_TikTokOutTextMessage_Fragment
  & FtOtherPlatformParts_TikTokOutTextMessage_Fragment
  & FtSystemParts_TikTokOutTextMessage_Fragment
);

type FtMessageParts_TikTokOutUnknownMessage_Fragment = (
  { __typename?: 'TikTokOutUnknownMessage' }
  & FtMessageCommon_TikTokOutUnknownMessage_Fragment
  & FtWhatsAppParts_TikTokOutUnknownMessage_Fragment
  & FtWidgetParts_TikTokOutUnknownMessage_Fragment
  & FtOtherPlatformParts_TikTokOutUnknownMessage_Fragment
  & FtSystemParts_TikTokOutUnknownMessage_Fragment
);

type FtMessageParts_WebWidgetAttachmentMessage_Fragment = (
  { __typename?: 'WebWidgetAttachmentMessage' }
  & FtMessageCommon_WebWidgetAttachmentMessage_Fragment
  & FtWhatsAppParts_WebWidgetAttachmentMessage_Fragment
  & FtWidgetParts_WebWidgetAttachmentMessage_Fragment
  & FtOtherPlatformParts_WebWidgetAttachmentMessage_Fragment
  & FtSystemParts_WebWidgetAttachmentMessage_Fragment
);

type FtMessageParts_WebWidgetCallPhoneButtonClickMessage_Fragment = (
  { __typename?: 'WebWidgetCallPhoneButtonClickMessage' }
  & FtMessageCommon_WebWidgetCallPhoneButtonClickMessage_Fragment
  & FtWhatsAppParts_WebWidgetCallPhoneButtonClickMessage_Fragment
  & FtWidgetParts_WebWidgetCallPhoneButtonClickMessage_Fragment
  & FtOtherPlatformParts_WebWidgetCallPhoneButtonClickMessage_Fragment
  & FtSystemParts_WebWidgetCallPhoneButtonClickMessage_Fragment
);

type FtMessageParts_WebWidgetContinueFlowButtonClickMessage_Fragment = (
  { __typename?: 'WebWidgetContinueFlowButtonClickMessage' }
  & FtMessageCommon_WebWidgetContinueFlowButtonClickMessage_Fragment
  & FtWhatsAppParts_WebWidgetContinueFlowButtonClickMessage_Fragment
  & FtWidgetParts_WebWidgetContinueFlowButtonClickMessage_Fragment
  & FtOtherPlatformParts_WebWidgetContinueFlowButtonClickMessage_Fragment
  & FtSystemParts_WebWidgetContinueFlowButtonClickMessage_Fragment
);

type FtMessageParts_WebWidgetOpenUrlButtonClickMessage_Fragment = (
  { __typename?: 'WebWidgetOpenURLButtonClickMessage' }
  & FtMessageCommon_WebWidgetOpenUrlButtonClickMessage_Fragment
  & FtWhatsAppParts_WebWidgetOpenUrlButtonClickMessage_Fragment
  & FtWidgetParts_WebWidgetOpenUrlButtonClickMessage_Fragment
  & FtOtherPlatformParts_WebWidgetOpenUrlButtonClickMessage_Fragment
  & FtSystemParts_WebWidgetOpenUrlButtonClickMessage_Fragment
);

type FtMessageParts_WebWidgetTextAndButtonsMessage_Fragment = (
  { __typename?: 'WebWidgetTextAndButtonsMessage' }
  & FtMessageCommon_WebWidgetTextAndButtonsMessage_Fragment
  & FtWhatsAppParts_WebWidgetTextAndButtonsMessage_Fragment
  & FtWidgetParts_WebWidgetTextAndButtonsMessage_Fragment
  & FtOtherPlatformParts_WebWidgetTextAndButtonsMessage_Fragment
  & FtSystemParts_WebWidgetTextAndButtonsMessage_Fragment
);

type FtMessageParts_WebWidgetTextMessage_Fragment = (
  { __typename?: 'WebWidgetTextMessage' }
  & FtMessageCommon_WebWidgetTextMessage_Fragment
  & FtWhatsAppParts_WebWidgetTextMessage_Fragment
  & FtWidgetParts_WebWidgetTextMessage_Fragment
  & FtOtherPlatformParts_WebWidgetTextMessage_Fragment
  & FtSystemParts_WebWidgetTextMessage_Fragment
);

type FtMessageParts_WhatsAppInAudioMessage_Fragment = (
  { __typename?: 'WhatsAppInAudioMessage' }
  & FtMessageCommon_WhatsAppInAudioMessage_Fragment
  & FtWhatsAppParts_WhatsAppInAudioMessage_Fragment
  & FtWidgetParts_WhatsAppInAudioMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInAudioMessage_Fragment
  & FtSystemParts_WhatsAppInAudioMessage_Fragment
);

type FtMessageParts_WhatsAppInContinueFlowButtonClickMessage_Fragment = (
  { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' }
  & FtMessageCommon_WhatsAppInContinueFlowButtonClickMessage_Fragment
  & FtWhatsAppParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
  & FtWidgetParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
  & FtSystemParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
);

type FtMessageParts_WhatsAppInDocumentMessage_Fragment = (
  { __typename?: 'WhatsAppInDocumentMessage' }
  & FtMessageCommon_WhatsAppInDocumentMessage_Fragment
  & FtWhatsAppParts_WhatsAppInDocumentMessage_Fragment
  & FtWidgetParts_WhatsAppInDocumentMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInDocumentMessage_Fragment
  & FtSystemParts_WhatsAppInDocumentMessage_Fragment
);

type FtMessageParts_WhatsAppInImageMessage_Fragment = (
  { __typename?: 'WhatsAppInImageMessage' }
  & FtMessageCommon_WhatsAppInImageMessage_Fragment
  & FtWhatsAppParts_WhatsAppInImageMessage_Fragment
  & FtWidgetParts_WhatsAppInImageMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInImageMessage_Fragment
  & FtSystemParts_WhatsAppInImageMessage_Fragment
);

type FtMessageParts_WhatsAppInListRowClickMessage_Fragment = (
  { __typename?: 'WhatsAppInListRowClickMessage' }
  & FtMessageCommon_WhatsAppInListRowClickMessage_Fragment
  & FtWhatsAppParts_WhatsAppInListRowClickMessage_Fragment
  & FtWidgetParts_WhatsAppInListRowClickMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInListRowClickMessage_Fragment
  & FtSystemParts_WhatsAppInListRowClickMessage_Fragment
);

type FtMessageParts_WhatsAppInMediaPlaceholderMessage_Fragment = (
  { __typename?: 'WhatsAppInMediaPlaceholderMessage' }
  & FtMessageCommon_WhatsAppInMediaPlaceholderMessage_Fragment
  & FtWhatsAppParts_WhatsAppInMediaPlaceholderMessage_Fragment
  & FtWidgetParts_WhatsAppInMediaPlaceholderMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInMediaPlaceholderMessage_Fragment
  & FtSystemParts_WhatsAppInMediaPlaceholderMessage_Fragment
);

type FtMessageParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = (
  { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' }
  & FtMessageCommon_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  & FtWhatsAppParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  & FtWidgetParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  & FtSystemParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
);

type FtMessageParts_WhatsAppInTextMessage_Fragment = (
  { __typename?: 'WhatsAppInTextMessage' }
  & FtMessageCommon_WhatsAppInTextMessage_Fragment
  & FtWhatsAppParts_WhatsAppInTextMessage_Fragment
  & FtWidgetParts_WhatsAppInTextMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInTextMessage_Fragment
  & FtSystemParts_WhatsAppInTextMessage_Fragment
);

type FtMessageParts_WhatsAppInUnknownMessage_Fragment = (
  { __typename?: 'WhatsAppInUnknownMessage' }
  & FtMessageCommon_WhatsAppInUnknownMessage_Fragment
  & FtWhatsAppParts_WhatsAppInUnknownMessage_Fragment
  & FtWidgetParts_WhatsAppInUnknownMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInUnknownMessage_Fragment
  & FtSystemParts_WhatsAppInUnknownMessage_Fragment
);

type FtMessageParts_WhatsAppInVideoMessage_Fragment = (
  { __typename?: 'WhatsAppInVideoMessage' }
  & FtMessageCommon_WhatsAppInVideoMessage_Fragment
  & FtWhatsAppParts_WhatsAppInVideoMessage_Fragment
  & FtWidgetParts_WhatsAppInVideoMessage_Fragment
  & FtOtherPlatformParts_WhatsAppInVideoMessage_Fragment
  & FtSystemParts_WhatsAppInVideoMessage_Fragment
);

type FtMessageParts_WhatsAppOutAudioMessage_Fragment = (
  { __typename?: 'WhatsAppOutAudioMessage' }
  & FtMessageCommon_WhatsAppOutAudioMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutAudioMessage_Fragment
  & FtWidgetParts_WhatsAppOutAudioMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutAudioMessage_Fragment
  & FtSystemParts_WhatsAppOutAudioMessage_Fragment
);

type FtMessageParts_WhatsAppOutDocumentMessage_Fragment = (
  { __typename?: 'WhatsAppOutDocumentMessage' }
  & FtMessageCommon_WhatsAppOutDocumentMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutDocumentMessage_Fragment
  & FtWidgetParts_WhatsAppOutDocumentMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutDocumentMessage_Fragment
  & FtSystemParts_WhatsAppOutDocumentMessage_Fragment
);

type FtMessageParts_WhatsAppOutImageMessage_Fragment = (
  { __typename?: 'WhatsAppOutImageMessage' }
  & FtMessageCommon_WhatsAppOutImageMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutImageMessage_Fragment
  & FtWidgetParts_WhatsAppOutImageMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutImageMessage_Fragment
  & FtSystemParts_WhatsAppOutImageMessage_Fragment
);

type FtMessageParts_WhatsAppOutListMessage_Fragment = (
  { __typename?: 'WhatsAppOutListMessage' }
  & FtMessageCommon_WhatsAppOutListMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutListMessage_Fragment
  & FtWidgetParts_WhatsAppOutListMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutListMessage_Fragment
  & FtSystemParts_WhatsAppOutListMessage_Fragment
);

type FtMessageParts_WhatsAppOutMediaPlaceholderMessage_Fragment = (
  { __typename?: 'WhatsAppOutMediaPlaceholderMessage' }
  & FtMessageCommon_WhatsAppOutMediaPlaceholderMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutMediaPlaceholderMessage_Fragment
  & FtWidgetParts_WhatsAppOutMediaPlaceholderMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutMediaPlaceholderMessage_Fragment
  & FtSystemParts_WhatsAppOutMediaPlaceholderMessage_Fragment
);

type FtMessageParts_WhatsAppOutTemplateMessage_Fragment = (
  { __typename?: 'WhatsAppOutTemplateMessage' }
  & FtMessageCommon_WhatsAppOutTemplateMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutTemplateMessage_Fragment
  & FtWidgetParts_WhatsAppOutTemplateMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutTemplateMessage_Fragment
  & FtSystemParts_WhatsAppOutTemplateMessage_Fragment
);

type FtMessageParts_WhatsAppOutTextAndButtonsMessage_Fragment = (
  { __typename?: 'WhatsAppOutTextAndButtonsMessage' }
  & FtMessageCommon_WhatsAppOutTextAndButtonsMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutTextAndButtonsMessage_Fragment
  & FtWidgetParts_WhatsAppOutTextAndButtonsMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutTextAndButtonsMessage_Fragment
  & FtSystemParts_WhatsAppOutTextAndButtonsMessage_Fragment
);

type FtMessageParts_WhatsAppOutTextAndUrlMessage_Fragment = (
  { __typename?: 'WhatsAppOutTextAndURLMessage' }
  & FtMessageCommon_WhatsAppOutTextAndUrlMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutTextAndUrlMessage_Fragment
  & FtWidgetParts_WhatsAppOutTextAndUrlMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutTextAndUrlMessage_Fragment
  & FtSystemParts_WhatsAppOutTextAndUrlMessage_Fragment
);

type FtMessageParts_WhatsAppOutTextMessage_Fragment = (
  { __typename?: 'WhatsAppOutTextMessage' }
  & FtMessageCommon_WhatsAppOutTextMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutTextMessage_Fragment
  & FtWidgetParts_WhatsAppOutTextMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutTextMessage_Fragment
  & FtSystemParts_WhatsAppOutTextMessage_Fragment
);

type FtMessageParts_WhatsAppOutUnknownMessage_Fragment = (
  { __typename?: 'WhatsAppOutUnknownMessage' }
  & FtMessageCommon_WhatsAppOutUnknownMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutUnknownMessage_Fragment
  & FtWidgetParts_WhatsAppOutUnknownMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutUnknownMessage_Fragment
  & FtSystemParts_WhatsAppOutUnknownMessage_Fragment
);

type FtMessageParts_WhatsAppOutVideoMessage_Fragment = (
  { __typename?: 'WhatsAppOutVideoMessage' }
  & FtMessageCommon_WhatsAppOutVideoMessage_Fragment
  & FtWhatsAppParts_WhatsAppOutVideoMessage_Fragment
  & FtWidgetParts_WhatsAppOutVideoMessage_Fragment
  & FtOtherPlatformParts_WhatsAppOutVideoMessage_Fragment
  & FtSystemParts_WhatsAppOutVideoMessage_Fragment
);

export type FtMessagePartsFragment = FtMessageParts_FacebookInAudioMessage_Fragment | FtMessageParts_FacebookInFileMessage_Fragment | FtMessageParts_FacebookInImageMessage_Fragment | FtMessageParts_FacebookInPostCommentMessage_Fragment | FtMessageParts_FacebookInTextMessage_Fragment | FtMessageParts_FacebookInUnknownMessage_Fragment | FtMessageParts_FacebookInVideoMessage_Fragment | FtMessageParts_FacebookOutAudioMessage_Fragment | FtMessageParts_FacebookOutImageMessage_Fragment | FtMessageParts_FacebookOutPublicCommentReplyMessage_Fragment | FtMessageParts_FacebookOutTextMessage_Fragment | FtMessageParts_FacebookOutUnknownMessage_Fragment | FtMessageParts_FacebookOutVideoMessage_Fragment | FtMessageParts_InstagramInAdCommentMessage_Fragment | FtMessageParts_InstagramInAudioMessage_Fragment | FtMessageParts_InstagramInFeedCommentMessage_Fragment | FtMessageParts_InstagramInImageMessage_Fragment | FtMessageParts_InstagramInReelCommentMessage_Fragment | FtMessageParts_InstagramInStoryReplyMessage_Fragment | FtMessageParts_InstagramInTextMessage_Fragment | FtMessageParts_InstagramInUnknownMessage_Fragment | FtMessageParts_InstagramInVideoMessage_Fragment | FtMessageParts_InstagramOutAudioMessage_Fragment | FtMessageParts_InstagramOutImageMessage_Fragment | FtMessageParts_InstagramOutPublicCommentReplyMessage_Fragment | FtMessageParts_InstagramOutTextMessage_Fragment | FtMessageParts_InstagramOutUnknownMessage_Fragment | FtMessageParts_InstagramOutVideoMessage_Fragment | FtMessageParts_SystemConversationSummaryMessage_Fragment | FtMessageParts_SystemLivechatClosedByAutoClosingMessage_Fragment | FtMessageParts_SystemLivechatOpenedByBooking_Fragment | FtMessageParts_SystemLivechatOpenedByCoexMessage_Fragment | FtMessageParts_SystemLivechatOpenedByComponentMessage_Fragment | FtMessageParts_SystemLivechatOpenedByFacebookAppMessage_Fragment | FtMessageParts_SystemLivechatOpenedByInstagramAppMessage_Fragment | FtMessageParts_SystemLivechatOpenedByTikTokAppMessage_Fragment | FtMessageParts_SystemLivechatOpenedManuallyMessage_Fragment | FtMessageParts_SystemMetaConversionEventSentMessage_Fragment | FtMessageParts_SystemTypingMessage_Fragment | FtMessageParts_TikTokInImageMessage_Fragment | FtMessageParts_TikTokInTextMessage_Fragment | FtMessageParts_TikTokInTextPostCommentMessage_Fragment | FtMessageParts_TikTokInUnknownMessage_Fragment | FtMessageParts_TikTokOutImageMessage_Fragment | FtMessageParts_TikTokOutPublicCommentReplyMessage_Fragment | FtMessageParts_TikTokOutTextMessage_Fragment | FtMessageParts_TikTokOutUnknownMessage_Fragment | FtMessageParts_WebWidgetAttachmentMessage_Fragment | FtMessageParts_WebWidgetCallPhoneButtonClickMessage_Fragment | FtMessageParts_WebWidgetContinueFlowButtonClickMessage_Fragment | FtMessageParts_WebWidgetOpenUrlButtonClickMessage_Fragment | FtMessageParts_WebWidgetTextAndButtonsMessage_Fragment | FtMessageParts_WebWidgetTextMessage_Fragment | FtMessageParts_WhatsAppInAudioMessage_Fragment | FtMessageParts_WhatsAppInContinueFlowButtonClickMessage_Fragment | FtMessageParts_WhatsAppInDocumentMessage_Fragment | FtMessageParts_WhatsAppInImageMessage_Fragment | FtMessageParts_WhatsAppInListRowClickMessage_Fragment | FtMessageParts_WhatsAppInMediaPlaceholderMessage_Fragment | FtMessageParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | FtMessageParts_WhatsAppInTextMessage_Fragment | FtMessageParts_WhatsAppInUnknownMessage_Fragment | FtMessageParts_WhatsAppInVideoMessage_Fragment | FtMessageParts_WhatsAppOutAudioMessage_Fragment | FtMessageParts_WhatsAppOutDocumentMessage_Fragment | FtMessageParts_WhatsAppOutImageMessage_Fragment | FtMessageParts_WhatsAppOutListMessage_Fragment | FtMessageParts_WhatsAppOutMediaPlaceholderMessage_Fragment | FtMessageParts_WhatsAppOutTemplateMessage_Fragment | FtMessageParts_WhatsAppOutTextAndButtonsMessage_Fragment | FtMessageParts_WhatsAppOutTextAndUrlMessage_Fragment | FtMessageParts_WhatsAppOutTextMessage_Fragment | FtMessageParts_WhatsAppOutUnknownMessage_Fragment | FtMessageParts_WhatsAppOutVideoMessage_Fragment;

export type FtSessionPartsFragment = { __typename?: 'PreviewResponsesFlowSession', id: string, conversationID: string, startedAt: string, startingBlock?: { __typename?: 'AiAgentBlock', id: string, name: string } | { __typename?: 'ClearContactPropertyBlock', id: string, name: string } | { __typename?: 'DefaultReplyBlock', id: string, name: string } | { __typename?: 'RedirectToFlowBlock', id: string, name: string } | { __typename?: 'RegularActionBlock', id: string, name: string } | { __typename?: 'RegularContentBlock', id: string, name: string } | { __typename?: 'SetConditionBlock', id: string, name: string } | { __typename?: 'SetContactPropertyBlock', id: string, name: string } | { __typename?: 'TriggeredMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppListBlock', id: string, name: string } | { __typename?: 'WhatsAppOneTimeNotificationBlock', id: string, name: string } | { __typename?: 'WhatsAppScheduledMessageBlock', id: string, name: string } | { __typename?: 'WhatsAppTemplateBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndButtonsBlock', id: string, name: string } | { __typename?: 'WhatsAppTextAndURLBlock', id: string, name: string } | { __typename?: 'WidgetEntryPointBlock', id: string, name: string } | null };

export type FlowTestStartMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
}>;


export type FlowTestStartMutation = { __typename?: 'Mutation', previewResponsesStartInFlow: (
    { __typename?: 'PreviewResponsesFlowSession' }
    & FtSessionPartsFragment
  ) };

export type FlowTestSessionReadbackQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  flowID: Scalars['FlowID']['input'];
}>;


export type FlowTestSessionReadbackQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, flow: { __typename?: 'DefaultReplyFlow', id: string, previewResponsesSession?: (
        { __typename?: 'PreviewResponsesFlowSession' }
        & FtSessionPartsFragment
      ) | null } | { __typename?: 'RegularFlow', id: string, previewResponsesSession?: (
        { __typename?: 'PreviewResponsesFlowSession' }
        & FtSessionPartsFragment
      ) | null } } };

export type FlowTestMessagesQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['MessagesCursor']['input']>;
}>;


export type FlowTestMessagesQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, conversation: { __typename: 'Conversation', id: string, platform: Platform, messages: { __typename?: 'MessagePage', edges: Array<{ __typename?: 'MessageEdge', cursor: string, node: (
            { __typename?: 'FacebookInAudioMessage' }
            & FtMessageParts_FacebookInAudioMessage_Fragment
          ) | (
            { __typename?: 'FacebookInFileMessage' }
            & FtMessageParts_FacebookInFileMessage_Fragment
          ) | (
            { __typename?: 'FacebookInImageMessage' }
            & FtMessageParts_FacebookInImageMessage_Fragment
          ) | (
            { __typename?: 'FacebookInPostCommentMessage' }
            & FtMessageParts_FacebookInPostCommentMessage_Fragment
          ) | (
            { __typename?: 'FacebookInTextMessage' }
            & FtMessageParts_FacebookInTextMessage_Fragment
          ) | (
            { __typename?: 'FacebookInUnknownMessage' }
            & FtMessageParts_FacebookInUnknownMessage_Fragment
          ) | (
            { __typename?: 'FacebookInVideoMessage' }
            & FtMessageParts_FacebookInVideoMessage_Fragment
          ) | (
            { __typename?: 'FacebookOutAudioMessage' }
            & FtMessageParts_FacebookOutAudioMessage_Fragment
          ) | (
            { __typename?: 'FacebookOutImageMessage' }
            & FtMessageParts_FacebookOutImageMessage_Fragment
          ) | (
            { __typename?: 'FacebookOutPublicCommentReplyMessage' }
            & FtMessageParts_FacebookOutPublicCommentReplyMessage_Fragment
          ) | (
            { __typename?: 'FacebookOutTextMessage' }
            & FtMessageParts_FacebookOutTextMessage_Fragment
          ) | (
            { __typename?: 'FacebookOutUnknownMessage' }
            & FtMessageParts_FacebookOutUnknownMessage_Fragment
          ) | (
            { __typename?: 'FacebookOutVideoMessage' }
            & FtMessageParts_FacebookOutVideoMessage_Fragment
          ) | (
            { __typename?: 'InstagramInAdCommentMessage' }
            & FtMessageParts_InstagramInAdCommentMessage_Fragment
          ) | (
            { __typename?: 'InstagramInAudioMessage' }
            & FtMessageParts_InstagramInAudioMessage_Fragment
          ) | (
            { __typename?: 'InstagramInFeedCommentMessage' }
            & FtMessageParts_InstagramInFeedCommentMessage_Fragment
          ) | (
            { __typename?: 'InstagramInImageMessage' }
            & FtMessageParts_InstagramInImageMessage_Fragment
          ) | (
            { __typename?: 'InstagramInReelCommentMessage' }
            & FtMessageParts_InstagramInReelCommentMessage_Fragment
          ) | (
            { __typename?: 'InstagramInStoryReplyMessage' }
            & FtMessageParts_InstagramInStoryReplyMessage_Fragment
          ) | (
            { __typename?: 'InstagramInTextMessage' }
            & FtMessageParts_InstagramInTextMessage_Fragment
          ) | (
            { __typename?: 'InstagramInUnknownMessage' }
            & FtMessageParts_InstagramInUnknownMessage_Fragment
          ) | (
            { __typename?: 'InstagramInVideoMessage' }
            & FtMessageParts_InstagramInVideoMessage_Fragment
          ) | (
            { __typename?: 'InstagramOutAudioMessage' }
            & FtMessageParts_InstagramOutAudioMessage_Fragment
          ) | (
            { __typename?: 'InstagramOutImageMessage' }
            & FtMessageParts_InstagramOutImageMessage_Fragment
          ) | (
            { __typename?: 'InstagramOutPublicCommentReplyMessage' }
            & FtMessageParts_InstagramOutPublicCommentReplyMessage_Fragment
          ) | (
            { __typename?: 'InstagramOutTextMessage' }
            & FtMessageParts_InstagramOutTextMessage_Fragment
          ) | (
            { __typename?: 'InstagramOutUnknownMessage' }
            & FtMessageParts_InstagramOutUnknownMessage_Fragment
          ) | (
            { __typename?: 'InstagramOutVideoMessage' }
            & FtMessageParts_InstagramOutVideoMessage_Fragment
          ) | (
            { __typename?: 'SystemConversationSummaryMessage' }
            & FtMessageParts_SystemConversationSummaryMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatClosedByAutoClosingMessage' }
            & FtMessageParts_SystemLivechatClosedByAutoClosingMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedByBooking' }
            & FtMessageParts_SystemLivechatOpenedByBooking_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedByCoexMessage' }
            & FtMessageParts_SystemLivechatOpenedByCoexMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedByComponentMessage' }
            & FtMessageParts_SystemLivechatOpenedByComponentMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' }
            & FtMessageParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' }
            & FtMessageParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' }
            & FtMessageParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
          ) | (
            { __typename?: 'SystemLivechatOpenedManuallyMessage' }
            & FtMessageParts_SystemLivechatOpenedManuallyMessage_Fragment
          ) | (
            { __typename?: 'SystemMetaConversionEventSentMessage' }
            & FtMessageParts_SystemMetaConversionEventSentMessage_Fragment
          ) | (
            { __typename?: 'SystemTypingMessage' }
            & FtMessageParts_SystemTypingMessage_Fragment
          ) | (
            { __typename?: 'TikTokInImageMessage' }
            & FtMessageParts_TikTokInImageMessage_Fragment
          ) | (
            { __typename?: 'TikTokInTextMessage' }
            & FtMessageParts_TikTokInTextMessage_Fragment
          ) | (
            { __typename?: 'TikTokInTextPostCommentMessage' }
            & FtMessageParts_TikTokInTextPostCommentMessage_Fragment
          ) | (
            { __typename?: 'TikTokInUnknownMessage' }
            & FtMessageParts_TikTokInUnknownMessage_Fragment
          ) | (
            { __typename?: 'TikTokOutImageMessage' }
            & FtMessageParts_TikTokOutImageMessage_Fragment
          ) | (
            { __typename?: 'TikTokOutPublicCommentReplyMessage' }
            & FtMessageParts_TikTokOutPublicCommentReplyMessage_Fragment
          ) | (
            { __typename?: 'TikTokOutTextMessage' }
            & FtMessageParts_TikTokOutTextMessage_Fragment
          ) | (
            { __typename?: 'TikTokOutUnknownMessage' }
            & FtMessageParts_TikTokOutUnknownMessage_Fragment
          ) | (
            { __typename?: 'WebWidgetAttachmentMessage' }
            & FtMessageParts_WebWidgetAttachmentMessage_Fragment
          ) | (
            { __typename?: 'WebWidgetCallPhoneButtonClickMessage' }
            & FtMessageParts_WebWidgetCallPhoneButtonClickMessage_Fragment
          ) | (
            { __typename?: 'WebWidgetContinueFlowButtonClickMessage' }
            & FtMessageParts_WebWidgetContinueFlowButtonClickMessage_Fragment
          ) | (
            { __typename?: 'WebWidgetOpenURLButtonClickMessage' }
            & FtMessageParts_WebWidgetOpenUrlButtonClickMessage_Fragment
          ) | (
            { __typename?: 'WebWidgetTextAndButtonsMessage' }
            & FtMessageParts_WebWidgetTextAndButtonsMessage_Fragment
          ) | (
            { __typename?: 'WebWidgetTextMessage' }
            & FtMessageParts_WebWidgetTextMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInAudioMessage' }
            & FtMessageParts_WhatsAppInAudioMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' }
            & FtMessageParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInDocumentMessage' }
            & FtMessageParts_WhatsAppInDocumentMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInImageMessage' }
            & FtMessageParts_WhatsAppInImageMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInListRowClickMessage' }
            & FtMessageParts_WhatsAppInListRowClickMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInMediaPlaceholderMessage' }
            & FtMessageParts_WhatsAppInMediaPlaceholderMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' }
            & FtMessageParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInTextMessage' }
            & FtMessageParts_WhatsAppInTextMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInUnknownMessage' }
            & FtMessageParts_WhatsAppInUnknownMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppInVideoMessage' }
            & FtMessageParts_WhatsAppInVideoMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutAudioMessage' }
            & FtMessageParts_WhatsAppOutAudioMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutDocumentMessage' }
            & FtMessageParts_WhatsAppOutDocumentMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutImageMessage' }
            & FtMessageParts_WhatsAppOutImageMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutListMessage' }
            & FtMessageParts_WhatsAppOutListMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutMediaPlaceholderMessage' }
            & FtMessageParts_WhatsAppOutMediaPlaceholderMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutTemplateMessage' }
            & FtMessageParts_WhatsAppOutTemplateMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutTextAndButtonsMessage' }
            & FtMessageParts_WhatsAppOutTextAndButtonsMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutTextAndURLMessage' }
            & FtMessageParts_WhatsAppOutTextAndUrlMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutTextMessage' }
            & FtMessageParts_WhatsAppOutTextMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutUnknownMessage' }
            & FtMessageParts_WhatsAppOutUnknownMessage_Fragment
          ) | (
            { __typename?: 'WhatsAppOutVideoMessage' }
            & FtMessageParts_WhatsAppOutVideoMessage_Fragment
          ) }>, pageInfo: { __typename?: 'MessagePageInfo', hasNextPage: boolean, endCursor?: string | null } } } } };

export type FlowTestMessageAddedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
}>;


export type FlowTestMessageAddedSubscription = { __typename?: 'Subscription', messageAdded?: (
    { __typename?: 'FacebookInAudioMessage' }
    & FtMessageParts_FacebookInAudioMessage_Fragment
  ) | (
    { __typename?: 'FacebookInFileMessage' }
    & FtMessageParts_FacebookInFileMessage_Fragment
  ) | (
    { __typename?: 'FacebookInImageMessage' }
    & FtMessageParts_FacebookInImageMessage_Fragment
  ) | (
    { __typename?: 'FacebookInPostCommentMessage' }
    & FtMessageParts_FacebookInPostCommentMessage_Fragment
  ) | (
    { __typename?: 'FacebookInTextMessage' }
    & FtMessageParts_FacebookInTextMessage_Fragment
  ) | (
    { __typename?: 'FacebookInUnknownMessage' }
    & FtMessageParts_FacebookInUnknownMessage_Fragment
  ) | (
    { __typename?: 'FacebookInVideoMessage' }
    & FtMessageParts_FacebookInVideoMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutAudioMessage' }
    & FtMessageParts_FacebookOutAudioMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutImageMessage' }
    & FtMessageParts_FacebookOutImageMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutPublicCommentReplyMessage' }
    & FtMessageParts_FacebookOutPublicCommentReplyMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutTextMessage' }
    & FtMessageParts_FacebookOutTextMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutUnknownMessage' }
    & FtMessageParts_FacebookOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutVideoMessage' }
    & FtMessageParts_FacebookOutVideoMessage_Fragment
  ) | (
    { __typename?: 'InstagramInAdCommentMessage' }
    & FtMessageParts_InstagramInAdCommentMessage_Fragment
  ) | (
    { __typename?: 'InstagramInAudioMessage' }
    & FtMessageParts_InstagramInAudioMessage_Fragment
  ) | (
    { __typename?: 'InstagramInFeedCommentMessage' }
    & FtMessageParts_InstagramInFeedCommentMessage_Fragment
  ) | (
    { __typename?: 'InstagramInImageMessage' }
    & FtMessageParts_InstagramInImageMessage_Fragment
  ) | (
    { __typename?: 'InstagramInReelCommentMessage' }
    & FtMessageParts_InstagramInReelCommentMessage_Fragment
  ) | (
    { __typename?: 'InstagramInStoryReplyMessage' }
    & FtMessageParts_InstagramInStoryReplyMessage_Fragment
  ) | (
    { __typename?: 'InstagramInTextMessage' }
    & FtMessageParts_InstagramInTextMessage_Fragment
  ) | (
    { __typename?: 'InstagramInUnknownMessage' }
    & FtMessageParts_InstagramInUnknownMessage_Fragment
  ) | (
    { __typename?: 'InstagramInVideoMessage' }
    & FtMessageParts_InstagramInVideoMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutAudioMessage' }
    & FtMessageParts_InstagramOutAudioMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutImageMessage' }
    & FtMessageParts_InstagramOutImageMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutPublicCommentReplyMessage' }
    & FtMessageParts_InstagramOutPublicCommentReplyMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutTextMessage' }
    & FtMessageParts_InstagramOutTextMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutUnknownMessage' }
    & FtMessageParts_InstagramOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutVideoMessage' }
    & FtMessageParts_InstagramOutVideoMessage_Fragment
  ) | (
    { __typename?: 'SystemConversationSummaryMessage' }
    & FtMessageParts_SystemConversationSummaryMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatClosedByAutoClosingMessage' }
    & FtMessageParts_SystemLivechatClosedByAutoClosingMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByBooking' }
    & FtMessageParts_SystemLivechatOpenedByBooking_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByCoexMessage' }
    & FtMessageParts_SystemLivechatOpenedByCoexMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByComponentMessage' }
    & FtMessageParts_SystemLivechatOpenedByComponentMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' }
    & FtMessageParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' }
    & FtMessageParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' }
    & FtMessageParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedManuallyMessage' }
    & FtMessageParts_SystemLivechatOpenedManuallyMessage_Fragment
  ) | (
    { __typename?: 'SystemMetaConversionEventSentMessage' }
    & FtMessageParts_SystemMetaConversionEventSentMessage_Fragment
  ) | (
    { __typename?: 'SystemTypingMessage' }
    & FtMessageParts_SystemTypingMessage_Fragment
  ) | (
    { __typename?: 'TikTokInImageMessage' }
    & FtMessageParts_TikTokInImageMessage_Fragment
  ) | (
    { __typename?: 'TikTokInTextMessage' }
    & FtMessageParts_TikTokInTextMessage_Fragment
  ) | (
    { __typename?: 'TikTokInTextPostCommentMessage' }
    & FtMessageParts_TikTokInTextPostCommentMessage_Fragment
  ) | (
    { __typename?: 'TikTokInUnknownMessage' }
    & FtMessageParts_TikTokInUnknownMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutImageMessage' }
    & FtMessageParts_TikTokOutImageMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutPublicCommentReplyMessage' }
    & FtMessageParts_TikTokOutPublicCommentReplyMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutTextMessage' }
    & FtMessageParts_TikTokOutTextMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutUnknownMessage' }
    & FtMessageParts_TikTokOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetAttachmentMessage' }
    & FtMessageParts_WebWidgetAttachmentMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetCallPhoneButtonClickMessage' }
    & FtMessageParts_WebWidgetCallPhoneButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetContinueFlowButtonClickMessage' }
    & FtMessageParts_WebWidgetContinueFlowButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetOpenURLButtonClickMessage' }
    & FtMessageParts_WebWidgetOpenUrlButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetTextAndButtonsMessage' }
    & FtMessageParts_WebWidgetTextAndButtonsMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetTextMessage' }
    & FtMessageParts_WebWidgetTextMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInAudioMessage' }
    & FtMessageParts_WhatsAppInAudioMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' }
    & FtMessageParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInDocumentMessage' }
    & FtMessageParts_WhatsAppInDocumentMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInImageMessage' }
    & FtMessageParts_WhatsAppInImageMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInListRowClickMessage' }
    & FtMessageParts_WhatsAppInListRowClickMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInMediaPlaceholderMessage' }
    & FtMessageParts_WhatsAppInMediaPlaceholderMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' }
    & FtMessageParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInTextMessage' }
    & FtMessageParts_WhatsAppInTextMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInUnknownMessage' }
    & FtMessageParts_WhatsAppInUnknownMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInVideoMessage' }
    & FtMessageParts_WhatsAppInVideoMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutAudioMessage' }
    & FtMessageParts_WhatsAppOutAudioMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutDocumentMessage' }
    & FtMessageParts_WhatsAppOutDocumentMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutImageMessage' }
    & FtMessageParts_WhatsAppOutImageMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutListMessage' }
    & FtMessageParts_WhatsAppOutListMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutMediaPlaceholderMessage' }
    & FtMessageParts_WhatsAppOutMediaPlaceholderMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTemplateMessage' }
    & FtMessageParts_WhatsAppOutTemplateMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTextAndButtonsMessage' }
    & FtMessageParts_WhatsAppOutTextAndButtonsMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTextAndURLMessage' }
    & FtMessageParts_WhatsAppOutTextAndUrlMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTextMessage' }
    & FtMessageParts_WhatsAppOutTextMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutUnknownMessage' }
    & FtMessageParts_WhatsAppOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutVideoMessage' }
    & FtMessageParts_WhatsAppOutVideoMessage_Fragment
  ) | null };

export type FlowTestMessageUpdatedSubscriptionVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
}>;


export type FlowTestMessageUpdatedSubscription = { __typename?: 'Subscription', messageUpdated?: (
    { __typename?: 'FacebookInAudioMessage' }
    & FtMessageParts_FacebookInAudioMessage_Fragment
  ) | (
    { __typename?: 'FacebookInFileMessage' }
    & FtMessageParts_FacebookInFileMessage_Fragment
  ) | (
    { __typename?: 'FacebookInImageMessage' }
    & FtMessageParts_FacebookInImageMessage_Fragment
  ) | (
    { __typename?: 'FacebookInPostCommentMessage' }
    & FtMessageParts_FacebookInPostCommentMessage_Fragment
  ) | (
    { __typename?: 'FacebookInTextMessage' }
    & FtMessageParts_FacebookInTextMessage_Fragment
  ) | (
    { __typename?: 'FacebookInUnknownMessage' }
    & FtMessageParts_FacebookInUnknownMessage_Fragment
  ) | (
    { __typename?: 'FacebookInVideoMessage' }
    & FtMessageParts_FacebookInVideoMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutAudioMessage' }
    & FtMessageParts_FacebookOutAudioMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutImageMessage' }
    & FtMessageParts_FacebookOutImageMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutPublicCommentReplyMessage' }
    & FtMessageParts_FacebookOutPublicCommentReplyMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutTextMessage' }
    & FtMessageParts_FacebookOutTextMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutUnknownMessage' }
    & FtMessageParts_FacebookOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'FacebookOutVideoMessage' }
    & FtMessageParts_FacebookOutVideoMessage_Fragment
  ) | (
    { __typename?: 'InstagramInAdCommentMessage' }
    & FtMessageParts_InstagramInAdCommentMessage_Fragment
  ) | (
    { __typename?: 'InstagramInAudioMessage' }
    & FtMessageParts_InstagramInAudioMessage_Fragment
  ) | (
    { __typename?: 'InstagramInFeedCommentMessage' }
    & FtMessageParts_InstagramInFeedCommentMessage_Fragment
  ) | (
    { __typename?: 'InstagramInImageMessage' }
    & FtMessageParts_InstagramInImageMessage_Fragment
  ) | (
    { __typename?: 'InstagramInReelCommentMessage' }
    & FtMessageParts_InstagramInReelCommentMessage_Fragment
  ) | (
    { __typename?: 'InstagramInStoryReplyMessage' }
    & FtMessageParts_InstagramInStoryReplyMessage_Fragment
  ) | (
    { __typename?: 'InstagramInTextMessage' }
    & FtMessageParts_InstagramInTextMessage_Fragment
  ) | (
    { __typename?: 'InstagramInUnknownMessage' }
    & FtMessageParts_InstagramInUnknownMessage_Fragment
  ) | (
    { __typename?: 'InstagramInVideoMessage' }
    & FtMessageParts_InstagramInVideoMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutAudioMessage' }
    & FtMessageParts_InstagramOutAudioMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutImageMessage' }
    & FtMessageParts_InstagramOutImageMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutPublicCommentReplyMessage' }
    & FtMessageParts_InstagramOutPublicCommentReplyMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutTextMessage' }
    & FtMessageParts_InstagramOutTextMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutUnknownMessage' }
    & FtMessageParts_InstagramOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'InstagramOutVideoMessage' }
    & FtMessageParts_InstagramOutVideoMessage_Fragment
  ) | (
    { __typename?: 'SystemConversationSummaryMessage' }
    & FtMessageParts_SystemConversationSummaryMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatClosedByAutoClosingMessage' }
    & FtMessageParts_SystemLivechatClosedByAutoClosingMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByBooking' }
    & FtMessageParts_SystemLivechatOpenedByBooking_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByCoexMessage' }
    & FtMessageParts_SystemLivechatOpenedByCoexMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByComponentMessage' }
    & FtMessageParts_SystemLivechatOpenedByComponentMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByFacebookAppMessage' }
    & FtMessageParts_SystemLivechatOpenedByFacebookAppMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByInstagramAppMessage' }
    & FtMessageParts_SystemLivechatOpenedByInstagramAppMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedByTikTokAppMessage' }
    & FtMessageParts_SystemLivechatOpenedByTikTokAppMessage_Fragment
  ) | (
    { __typename?: 'SystemLivechatOpenedManuallyMessage' }
    & FtMessageParts_SystemLivechatOpenedManuallyMessage_Fragment
  ) | (
    { __typename?: 'SystemMetaConversionEventSentMessage' }
    & FtMessageParts_SystemMetaConversionEventSentMessage_Fragment
  ) | (
    { __typename?: 'SystemTypingMessage' }
    & FtMessageParts_SystemTypingMessage_Fragment
  ) | (
    { __typename?: 'TikTokInImageMessage' }
    & FtMessageParts_TikTokInImageMessage_Fragment
  ) | (
    { __typename?: 'TikTokInTextMessage' }
    & FtMessageParts_TikTokInTextMessage_Fragment
  ) | (
    { __typename?: 'TikTokInTextPostCommentMessage' }
    & FtMessageParts_TikTokInTextPostCommentMessage_Fragment
  ) | (
    { __typename?: 'TikTokInUnknownMessage' }
    & FtMessageParts_TikTokInUnknownMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutImageMessage' }
    & FtMessageParts_TikTokOutImageMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutPublicCommentReplyMessage' }
    & FtMessageParts_TikTokOutPublicCommentReplyMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutTextMessage' }
    & FtMessageParts_TikTokOutTextMessage_Fragment
  ) | (
    { __typename?: 'TikTokOutUnknownMessage' }
    & FtMessageParts_TikTokOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetAttachmentMessage' }
    & FtMessageParts_WebWidgetAttachmentMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetCallPhoneButtonClickMessage' }
    & FtMessageParts_WebWidgetCallPhoneButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetContinueFlowButtonClickMessage' }
    & FtMessageParts_WebWidgetContinueFlowButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetOpenURLButtonClickMessage' }
    & FtMessageParts_WebWidgetOpenUrlButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetTextAndButtonsMessage' }
    & FtMessageParts_WebWidgetTextAndButtonsMessage_Fragment
  ) | (
    { __typename?: 'WebWidgetTextMessage' }
    & FtMessageParts_WebWidgetTextMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInAudioMessage' }
    & FtMessageParts_WhatsAppInAudioMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' }
    & FtMessageParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInDocumentMessage' }
    & FtMessageParts_WhatsAppInDocumentMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInImageMessage' }
    & FtMessageParts_WhatsAppInImageMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInListRowClickMessage' }
    & FtMessageParts_WhatsAppInListRowClickMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInMediaPlaceholderMessage' }
    & FtMessageParts_WhatsAppInMediaPlaceholderMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' }
    & FtMessageParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInTextMessage' }
    & FtMessageParts_WhatsAppInTextMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInUnknownMessage' }
    & FtMessageParts_WhatsAppInUnknownMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppInVideoMessage' }
    & FtMessageParts_WhatsAppInVideoMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutAudioMessage' }
    & FtMessageParts_WhatsAppOutAudioMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutDocumentMessage' }
    & FtMessageParts_WhatsAppOutDocumentMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutImageMessage' }
    & FtMessageParts_WhatsAppOutImageMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutListMessage' }
    & FtMessageParts_WhatsAppOutListMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutMediaPlaceholderMessage' }
    & FtMessageParts_WhatsAppOutMediaPlaceholderMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTemplateMessage' }
    & FtMessageParts_WhatsAppOutTemplateMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTextAndButtonsMessage' }
    & FtMessageParts_WhatsAppOutTextAndButtonsMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTextAndURLMessage' }
    & FtMessageParts_WhatsAppOutTextAndUrlMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutTextMessage' }
    & FtMessageParts_WhatsAppOutTextMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutUnknownMessage' }
    & FtMessageParts_WhatsAppOutUnknownMessage_Fragment
  ) | (
    { __typename?: 'WhatsAppOutVideoMessage' }
    & FtMessageParts_WhatsAppOutVideoMessage_Fragment
  ) | null };

export type FlowTestWidgetTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: WidgetTextMessageSendInput;
}>;


export type FlowTestWidgetTextSendMutation = { __typename?: 'Mutation', previewResponsesWidgetTextSend?: (
    { __typename?: 'WebWidgetTextMessage' }
    & FtMessageParts_WebWidgetTextMessage_Fragment
  ) | null };

export type FlowTestWhatsAppTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: WhatsAppTextMessageSendInput;
}>;


export type FlowTestWhatsAppTextSendMutation = { __typename?: 'Mutation', previewResponsesWhatsappTextSend?: (
    { __typename?: 'WhatsAppInTextMessage' }
    & FtMessageParts_WhatsAppInTextMessage_Fragment
  ) | null };

export type FlowTestInstagramTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: InstagramTextMessageSendInput;
}>;


export type FlowTestInstagramTextSendMutation = { __typename?: 'Mutation', previewResponsesInstagramTextSend?: (
    { __typename?: 'InstagramInTextMessage' }
    & FtMessageParts_InstagramInTextMessage_Fragment
  ) | null };

export type FlowTestTikTokTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: TikTokTextMessageSendInput;
}>;


export type FlowTestTikTokTextSendMutation = { __typename?: 'Mutation', previewResponsesTikTokTextSend?: (
    { __typename?: 'TikTokInTextMessage' }
    & FtMessageParts_TikTokInTextMessage_Fragment
  ) | null };

export type FlowTestFacebookTextSendMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  message: FacebookTextMessageSendInput;
}>;


export type FlowTestFacebookTextSendMutation = { __typename?: 'Mutation', previewResponsesFacebookTextSend?: (
    { __typename?: 'FacebookInTextMessage' }
    & FtMessageParts_FacebookInTextMessage_Fragment
  ) | null };

export type FlowTestWidgetContinueFlowClickMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  click: PreviewResponsesBtnClickInput;
}>;


export type FlowTestWidgetContinueFlowClickMutation = { __typename?: 'Mutation', previewResponsesWidgetContinueFlowBtnClickSend: (
    { __typename?: 'WebWidgetContinueFlowButtonClickMessage' }
    & FtMessageParts_WebWidgetContinueFlowButtonClickMessage_Fragment
  ) };

export type FlowTestWidgetOpenUrlClickMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  click: PreviewResponsesBtnClickInput;
}>;


export type FlowTestWidgetOpenUrlClickMutation = { __typename?: 'Mutation', previewResponsesWidgetOpenURLBtnClickSend: (
    { __typename?: 'WebWidgetOpenURLButtonClickMessage' }
    & FtMessageParts_WebWidgetOpenUrlButtonClickMessage_Fragment
  ) };

export type FlowTestWidgetCallPhoneClickMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  click: PreviewResponsesBtnClickInput;
}>;


export type FlowTestWidgetCallPhoneClickMutation = { __typename?: 'Mutation', previewResponsesWidgetCallPhoneBtnClickSend: (
    { __typename?: 'WebWidgetCallPhoneButtonClickMessage' }
    & FtMessageParts_WebWidgetCallPhoneButtonClickMessage_Fragment
  ) };

export type FlowTestWhatsAppContinueFlowClickMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  click: PreviewResponsesBtnClickInput;
}>;


export type FlowTestWhatsAppContinueFlowClickMutation = { __typename?: 'Mutation', previewResponsesWhatsappContinueFlowBtnClickSend: (
    { __typename?: 'WhatsAppInContinueFlowButtonClickMessage' }
    & FtMessageParts_WhatsAppInContinueFlowButtonClickMessage_Fragment
  ) };

export type FlowTestWhatsAppTemplateQuickReplyClickMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  click: PreviewResponsesBtnClickInput;
}>;


export type FlowTestWhatsAppTemplateQuickReplyClickMutation = { __typename?: 'Mutation', previewResponsesWhatsappTemplateQuickReplyBtnClickSend: (
    { __typename?: 'WhatsAppInTemplateQuickReplyButtonClickMessage' }
    & FtMessageParts_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment
  ) };

export type FlowTestWhatsAppListRowClickMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  click: PreviewResponsesWaListRowClickInput;
}>;


export type FlowTestWhatsAppListRowClickMutation = { __typename?: 'Mutation', previewResponsesWhatsappListRowClickSend: (
    { __typename?: 'WhatsAppInListRowClickMessage' }
    & FtMessageParts_WhatsAppInListRowClickMessage_Fragment
  ) };

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
export const ElementErrorsFragmentDoc = new TypedDocumentString(`
fragment ElementErrors on BlockElement {
  errors {
    __typename
    code
    message
    ... on ButtonValidationError {
      buttonID
    }
    ... on AiAgentRuleError {
      ruleID
    }
    ... on SendJsonHeaderError {
      headerID
    }
    ... on SendJsonURLParamError {
      urlParamID
    }
    ... on SendJsonResponseParsingRuleError {
      responseParsingRuleID
    }
    ... on SummarizeChatEntryValidationError {
      entryID
    }
    ... on WhatsAppTemplateParamValueRequiredError {
      paramName
    }
    ... on WhatsAppTemplateURLButtonParamValueRequiredError {
      buttonID
      paramName
    }
  }
}`, {"fragmentName":"ElementErrors"}) as unknown as TypedDocumentString<ElementErrorsFragment, unknown>;
export const AttrNameFragmentDoc = new TypedDocumentString(`
fragment AttrName on BotAttribute {
  name
  type
  dataType
}`, {"fragmentName":"AttrName"}) as unknown as TypedDocumentString<AttrNameFragment, unknown>;
export const TStrFragmentDoc = new TypedDocumentString(`
fragment TStr on TemplateStr {
  parts {
    __typename
    ... on TemplateStrText {
      text
      errCode
    }
    ... on TemplateStrAttribute {
      attribute {
        ...AttrName
      }
      errCode
    }
  }
}`, {"fragmentName":"TStr"}) as unknown as TypedDocumentString<TStrFragment, unknown>;
export const FileRefFragmentDoc = new TypedDocumentString(`
fragment FileRef on File {
  id
  url
  type
  status
  size
}`, {"fragmentName":"FileRef"}) as unknown as TypedDocumentString<FileRefFragment, unknown>;
export const WaBtnFragmentDoc = new TypedDocumentString(`
fragment WABtn on WhatsAppButton {
  __typename
  ... on WhatsAppContinueFlowButton {
    id
    title {
      ...TStr
    }
  }
  ... on WhatsAppOpenURLButton {
    id
    title {
      ...TStr
    }
    url {
      ...TStr
    }
  }
}`, {"fragmentName":"WABtn"}) as unknown as TypedDocumentString<WaBtnFragment, unknown>;
export const WaTplTextFragmentDoc = new TypedDocumentString(`
fragment WATplText on WhatsAppTemplateComponentText {
  text {
    __typename
    ... on WhatsAppTemplateComponentTextPartText {
      text
    }
    ... on WhatsAppTemplateComponentTextPartParam {
      name
      value {
        ...TStr
      }
    }
  }
}`, {"fragmentName":"WATplText"}) as unknown as TypedDocumentString<WaTplTextFragment, unknown>;
export const WidgetBtnFragmentDoc = new TypedDocumentString(`
fragment WidgetBtn on WidgetButton {
  __typename
  ... on WidgetContinueFlowButton {
    id
    title {
      ...TStr
    }
  }
  ... on WidgetOpenURLButton {
    id
    title {
      ...TStr
    }
    url {
      ...TStr
    }
  }
  ... on WidgetCallPhoneButton {
    id
    title {
      ...TStr
    }
    phone
  }
}`, {"fragmentName":"WidgetBtn"}) as unknown as TypedDocumentString<WidgetBtnFragment, unknown>;
export const SegmentFilterPartsFragmentDoc = new TypedDocumentString(`
fragment SegmentFilterParts on Filter {
  id
  byAttribute {
    attribute {
      ...AttrName
    }
    defaultStrategy {
      operator
      comparableValues
    }
    dateStrategy {
      operator
      comparableDate
    }
  }
  byTag {
    operator
    tagNames
  }
  byStoredSegment {
    operator
    segmentIDs
  }
}`, {"fragmentName":"SegmentFilterParts"}) as unknown as TypedDocumentString<SegmentFilterPartsFragment, unknown>;
export const SegmentPartsFragmentDoc = new TypedDocumentString(`
fragment SegmentParts on Segment {
  id
  name
  resultOperator
  filters {
    ...SegmentFilterParts
    byInFlightSegment {
      id
      name
      resultOperator
      filters {
        ...SegmentFilterParts
      }
    }
  }
}`, {"fragmentName":"SegmentParts"}) as unknown as TypedDocumentString<SegmentPartsFragment, unknown>;
export const TriggerPartsFragmentDoc = new TypedDocumentString(`
fragment TriggerParts on Trigger {
  id
  enabled
  conditionType
  delayValue
  delayUnit
  attributeCondition {
    attribute {
      ...AttrName
    }
    defaultStrategy {
      operator
      comparableValues
    }
    dateStrategy {
      operator
      comparableDate
    }
  }
  attributeConditionErrors
  validationErrors
}`, {"fragmentName":"TriggerParts"}) as unknown as TypedDocumentString<TriggerPartsFragment, unknown>;
export const ElementPartsFragmentDoc = new TypedDocumentString(`
fragment ElementParts on BlockElement {
  __typename
  id
  platform
  ...ElementErrors
  ... on ContentBlockElement {
    waitForReplies
    saveContactReply
    savingToAttribute {
      ...AttrName
    }
  }
  ... on WhatsAppTextBlockElement {
    text {
      ...TStr
    }
  }
  ... on WhatsAppImageBlockElement {
    image {
      ...FileRef
    }
    caption {
      ...TStr
    }
  }
  ... on WhatsAppVideoBlockElement {
    video {
      ...FileRef
    }
    caption {
      ...TStr
    }
    fileName
  }
  ... on WhatsAppAudioBlockElement {
    audio {
      ...FileRef
    }
    fileName
  }
  ... on WhatsAppDocumentBlockElement {
    document {
      ...FileRef
    }
    caption {
      ...TStr
    }
    fileName
  }
  ... on WhatsAppTextAndButtonsBlockElement {
    headerText {
      ...TStr
    }
    bodyText {
      ...TStr
    }
    footerText {
      ...TStr
    }
    buttons {
      ...WABtn
    }
  }
  ... on WhatsAppTextAndURLBlockElement {
    headerText {
      ...TStr
    }
    bodyText {
      ...TStr
    }
    footerText {
      ...TStr
    }
    buttons {
      ...WABtn
    }
  }
  ... on WhatsAppListBlockElement {
    bodyText {
      ...TStr
    }
    buttonTitle {
      ...TStr
    }
    rows {
      id
      title {
        ...TStr
      }
      description {
        ...TStr
      }
    }
  }
  ... on WhatsAppTemplateBlockElement {
    whatsAppTemplate {
      templateID
      name
      status
      header {
        __typename
        ... on WhatsAppTemplateComponentText {
          ...WATplText
        }
        ... on WhatsAppTemplateComponentImage {
          image {
            ...FileRef
          }
        }
        ... on WhatsAppTemplateComponentVideo {
          video {
            ...FileRef
          }
        }
        ... on WhatsAppTemplateComponentDocument {
          document {
            ...FileRef
          }
          fileName
        }
      }
      body {
        ... on WhatsAppTemplateComponentText {
          ...WATplText
        }
      }
      footer {
        ... on WhatsAppTemplateComponentText {
          ...WATplText
        }
      }
      buttons {
        __typename
        ... on WhatsAppTemplateURLButton {
          id
          text
          url {
            __typename
            ... on WhatsAppTemplateComponentTextPartText {
              text
            }
            ... on WhatsAppTemplateComponentTextPartParam {
              name
              value {
                ...TStr
              }
            }
          }
        }
        ... on WhatsAppTemplateQuickReplyButton {
          id
          text
        }
        ... on WhatsAppTemplateCallPhoneButton {
          text
          phoneNumber
        }
        ... on WhatsAppTemplateWhatsAppCallButton {
          text
        }
        ... on WhatsAppTemplateCopyCodeButton {
          id
          text
          code {
            ...TStr
          }
        }
      }
    }
  }
  ... on WidgetTextAndButtonBlockElement {
    text {
      ...TStr
    }
    buttons {
      ...WidgetBtn
    }
  }
  ... on WidgetImageBlockElement {
    image {
      ...FileRef
    }
  }
  ... on WidgetEntryPointBlockElement {
    nextBlockHandleID
  }
  ... on DefaultReplyBlockElement {
    nextBlockHandleID
    replyFrequency
  }
  ... on TriggeredMessageBlockElement {
    handleID
    segment {
      ...SegmentParts
    }
    segmentErrors {
      filterID
      code
    }
    trigger {
      ...TriggerParts
    }
  }
  ... on WhatsAppOneTimeNotificationBlockElement {
    status
    handleID
    segment {
      ...SegmentParts
    }
    segmentErrors {
      filterID
      code
    }
    sentToContactsCount
  }
  ... on WhatsAppScheduledMessageBlockElement {
    handleID
    segment {
      ...SegmentParts
    }
    segmentErrors {
      filterID
      code
    }
    status
    firstSendTime
    repeatType
    repeatOnWeekdays
    repeatEveryNDays
    repeatOnCertainDates
  }
  ... on SetConditionBlockElement {
    handleID
    segment {
      ...SegmentParts
    }
    segmentErrors {
      filterID
      code
    }
  }
  ... on SetContactPropertyBlockElement {
    attribute {
      ...AttrName
    }
    value
  }
  ... on ClearContactPropertyBlockElement {
    attribute {
      ...AttrName
    }
  }
  ... on RedirectToFlowBlockElement {
    flow {
      id
      name
    }
  }
  ... on SendJsonBlockElement {
    httpMethod
    url {
      ...TStr
    }
    headers {
      id
      title {
        ...TStr
      }
      value {
        ...TStr
      }
    }
    payloadType
    customRequestPayload {
      ...TStr
    }
    encodedURLPayload {
      id
      title {
        ...TStr
      }
      value {
        ...TStr
      }
    }
    responseParsingRulesEnabled
    responseParsingRules {
      id
      jsonPath
      attribute {
        ...AttrName
      }
    }
  }
  ... on SummarizeChatBlockElement {
    entries {
      id
      description
      attribute {
        ...AttrName
      }
    }
  }
  ... on FuelyAIAgentBlockElement {
    templateID
    additionalInstructions
    charsCount
    rules {
      id
      title
      prompt
    }
  }
  ... on AiAgentBlockElement {
    templateID
    maxTokens
    availableTokens
    knowledgeItems {
      id
      title
      description
      prompt
    }
    rules {
      id
      title
      prompt
    }
  }
  ... on AiAgentCustomBlockElement {
    maxTokens
    availableTokens
    prompt
    rules {
      id
      title
      prompt
    }
  }
}`, {"fragmentName":"ElementParts"}) as unknown as TypedDocumentString<ElementPartsFragment, unknown>;
export const BlockPartsFragmentDoc = new TypedDocumentString(`
fragment BlockParts on Block {
  __typename
  id
  name
  positionX
  positionY
  platform
  ... on RegularContentBlock {
    isStartingPoint
  }
  ... on AiAgentBlock {
    isStartingPoint
  }
  ... on WhatsAppListBlock {
    isStartingPoint
  }
  ... on WhatsAppTemplateBlock {
    isStartingPoint
  }
  ... on WhatsAppTextAndButtonsBlock {
    isStartingPoint
  }
  ... on WhatsAppTextAndURLBlock {
    isStartingPoint
  }
  ... on RegularActionBlock {
    isStartingPoint
  }
  ... on ClearContactPropertyBlock {
    isStartingPoint
  }
  ... on SetConditionBlock {
    isStartingPoint
  }
  ... on SetContactPropertyBlock {
    isStartingPoint
  }
  ... on RedirectToFlowBlock {
    isStartingPoint
  }
  ... on DefaultReplyBlock {
    showToggle
    isEntryPointEnabled
  }
  ... on TriggeredMessageBlock {
    showToggle
    isEntryPointEnabled
  }
  ... on WhatsAppOneTimeNotificationBlock {
    showToggle
    isEntryPointEnabled
  }
  ... on WhatsAppScheduledMessageBlock {
    showToggle
    isEntryPointEnabled
  }
  ... on WidgetEntryPointBlock {
    showToggle
    isEntryPointEnabled
  }
  blockElements {
    ...ElementParts
  }
}`, {"fragmentName":"BlockParts"}) as unknown as TypedDocumentString<BlockPartsFragment, unknown>;
export const ConnectionPartsFragmentDoc = new TypedDocumentString(`
fragment ConnectionParts on Connection {
  __typename
  ... on BlockToBlockConnection {
    id
    sourceBlockID
    targetBlockID
  }
  ... on ComponentToBlockConnection {
    id
    sourceBlockID
    sourceBlockElementID
    sourceHandleID
    targetBlockID
  }
}`, {"fragmentName":"ConnectionParts"}) as unknown as TypedDocumentString<ConnectionPartsFragment, unknown>;
export const FlowPartsFragmentDoc = new TypedDocumentString(`
fragment FlowParts on Flow {
  __typename
  id
  name
  platform
  startingPointBlock {
    id
  }
  entryPoints {
    __typename
    id
    name
    isEntryPointEnabled
  }
  blocks {
    ...BlockParts
  }
  connections {
    ...ConnectionParts
  }
}`, {"fragmentName":"FlowParts"}) as unknown as TypedDocumentString<FlowPartsFragment, unknown>;
export const FlowListItemFragmentDoc = new TypedDocumentString(`
fragment FlowListItem on Flow {
  __typename
  id
  name
  platform
  entryPoints {
    id
    name
    isEntryPointEnabled
  }
}`, {"fragmentName":"FlowListItem"}) as unknown as TypedDocumentString<FlowListItemFragment, unknown>;
export const FlowBlocksSlimFragmentDoc = new TypedDocumentString(`
fragment FlowBlocksSlim on Flow {
  id
  blocks {
    __typename
    id
    name
    positionX
    positionY
  }
}`, {"fragmentName":"FlowBlocksSlim"}) as unknown as TypedDocumentString<FlowBlocksSlimFragment, unknown>;
export const FtMessageCommonFragmentDoc = new TypedDocumentString(`
fragment FtMessageCommon on Message {
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
}`, {"fragmentName":"FtMessageCommon"}) as unknown as TypedDocumentString<FtMessageCommonFragment, unknown>;
export const FtFileFragmentDoc = new TypedDocumentString(`
fragment FtFile on File {
  id
  url
  type
  status
  size
}`, {"fragmentName":"FtFile"}) as unknown as TypedDocumentString<FtFileFragment, unknown>;
export const FtWhatsAppPartsFragmentDoc = new TypedDocumentString(`
fragment FtWhatsAppParts on Message {
  ... on WhatsAppInTextMessage {
    text
  }
  ... on WhatsAppInContinueFlowButtonClickMessage {
    buttonTitle
  }
  ... on WhatsAppInTemplateQuickReplyButtonClickMessage {
    buttonTitle
  }
  ... on WhatsAppInListRowClickMessage {
    rowTitle
    rowDescription
  }
  ... on WhatsAppOutTextMessage {
    text
  }
  ... on WhatsAppOutTextAndButtonsMessage {
    headerText
    bodyText
    footerText
    whatsappButtons {
      __typename
      title
      ... on WhatsAppOpenURLMessageButton {
        url
      }
    }
  }
  ... on WhatsAppOutTextAndURLMessage {
    headerText
    bodyText
    footerText
    whatsappButtons {
      __typename
      title
      ... on WhatsAppOpenURLMessageButton {
        url
      }
    }
  }
  ... on WhatsAppOutListMessage {
    bodyText
    buttonTitle
    listRows {
      title
      description
    }
  }
  ... on WhatsAppOutTemplateMessage {
    header {
      __typename
      ... on WhatsAppOutTemplateMessageComponentText {
        text
      }
      ... on WhatsAppOutTemplateMessageComponentImage {
        file {
          ...FtFile
        }
      }
      ... on WhatsAppOutTemplateMessageComponentVideo {
        file {
          ...FtFile
        }
      }
      ... on WhatsAppOutTemplateMessageComponentDocument {
        file {
          ...FtFile
        }
      }
    }
    body {
      ... on WhatsAppOutTemplateMessageComponentText {
        text
      }
    }
    footer {
      ... on WhatsAppOutTemplateMessageComponentText {
        text
      }
    }
    waTemplateButtons {
      __typename
      ... on WhatsAppOutTemplateMessageURLButton {
        text
        url
      }
      ... on WhatsAppOutTemplateMessageQuickReplyButton {
        text
      }
    }
  }
  ... on WhatsAppOutImageMessage {
    caption
    file {
      ...FtFile
    }
  }
  ... on WhatsAppOutVideoMessage {
    caption
    file {
      ...FtFile
    }
  }
  ... on WhatsAppOutAudioMessage {
    file {
      ...FtFile
    }
  }
  ... on WhatsAppOutDocumentMessage {
    caption
    fileName
    file {
      ...FtFile
    }
  }
}`, {"fragmentName":"FtWhatsAppParts"}) as unknown as TypedDocumentString<FtWhatsAppPartsFragment, unknown>;
export const FtWidgetPartsFragmentDoc = new TypedDocumentString(`
fragment FtWidgetParts on Message {
  ... on WebWidgetTextMessage {
    text
  }
  ... on WebWidgetTextAndButtonsMessage {
    text
    buttons {
      __typename
      title
      ... on WebWidgetOpenURLButton {
        url
      }
      ... on WebWidgetCallPhoneButton {
        phone
      }
    }
  }
  ... on WebWidgetContinueFlowButtonClickMessage {
    button {
      title
    }
  }
  ... on WebWidgetOpenURLButtonClickMessage {
    button {
      title
      url
    }
  }
  ... on WebWidgetCallPhoneButtonClickMessage {
    button {
      title
      phone
    }
  }
}`, {"fragmentName":"FtWidgetParts"}) as unknown as TypedDocumentString<FtWidgetPartsFragment, unknown>;
export const FtOtherPlatformPartsFragmentDoc = new TypedDocumentString(`
fragment FtOtherPlatformParts on Message {
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
}`, {"fragmentName":"FtOtherPlatformParts"}) as unknown as TypedDocumentString<FtOtherPlatformPartsFragment, unknown>;
export const FtSystemPartsFragmentDoc = new TypedDocumentString(`
fragment FtSystemParts on Message {
  ... on SystemTypingMessage {
    until
  }
  ... on SystemConversationSummaryMessage {
    summary
  }
  ... on SystemLivechatOpenedByComponentMessage {
    originallyDecidedByAI
  }
}`, {"fragmentName":"FtSystemParts"}) as unknown as TypedDocumentString<FtSystemPartsFragment, unknown>;
export const FtMessagePartsFragmentDoc = new TypedDocumentString(`
fragment FtMessageParts on Message {
  ...FtMessageCommon
  ...FtWhatsAppParts
  ...FtWidgetParts
  ...FtOtherPlatformParts
  ...FtSystemParts
}`, {"fragmentName":"FtMessageParts"}) as unknown as TypedDocumentString<FtMessagePartsFragment, unknown>;
export const FtSessionPartsFragmentDoc = new TypedDocumentString(`
fragment FtSessionParts on PreviewResponsesFlowSession {
  id
  conversationID
  startedAt
  startingBlock {
    id
    name
  }
}`, {"fragmentName":"FtSessionParts"}) as unknown as TypedDocumentString<FtSessionPartsFragment, unknown>;
export const FlowsListDocument = new TypedDocumentString(`
query FlowsList($botID: BotID!) {
  bot(id: $botID) {
    id
    flowGroups {
      id
      name
      flows {
        ...FlowListItem
      }
    }
    flowsWithoutGroup {
      ...FlowListItem
    }
    defaultReplyFlows {
      ...FlowListItem
    }
  }
}
${FlowListItemFragmentDoc}`) as unknown as TypedDocumentString<FlowsListQuery, FlowsListQueryVariables>;
export const FlowStructureDocument = new TypedDocumentString(`
query FlowStructure($botID: BotID!, $flowID: FlowID!) {
  bot(id: $botID) {
    id
    flow(flowID: $flowID) {
      ...FlowParts
      inboundLinks {
        __typename
        ... on FlowToFlowInboundLink {
          id
          redirects
          flow {
            id
            name
          }
          block {
            id
            name
          }
        }
        ... on KeywordGroupToFlowInboundLink {
          id
          redirects
        }
      }
    }
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<FlowStructureQuery, FlowStructureQueryVariables>;
export const BotAttributesAutocompleteDocument = new TypedDocumentString(`
query BotAttributesAutocomplete($botID: BotID!, $locale: DashboardLocale!, $platforms: [Platform!]!, $attributeTypes: [AttributeType!]!, $inputSubstring: String, $first: Int, $after: BotAttributeCursor) {
  bot(id: $botID) {
    id
    botAttributes(
      locale: $locale
      platforms: $platforms
      attributeTypes: $attributeTypes
      inputSubstring: $inputSubstring
      first: $first
      after: $after
      filters: []
      orderBy: {orderBy: AttributeName, direction: Asc}
    ) {
      edges {
        cursor
        node {
          botAttribute {
            ...AttrName
            aliases {
              locale
              alias
            }
          }
          usersCount
          defaultValue
          flowsCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
${AttrNameFragmentDoc}`) as unknown as TypedDocumentString<BotAttributesAutocompleteQuery, BotAttributesAutocompleteQueryVariables>;
export const AiAgentTemplatesCatalogDocument = new TypedDocumentString(`
query AiAgentTemplatesCatalog($locale: DashboardLocale!) {
  aiAgentTemplates(locale: $locale) {
    id
    title
    description
  }
}`) as unknown as TypedDocumentString<AiAgentTemplatesCatalogQuery, AiAgentTemplatesCatalogQueryVariables>;
export const CreateFlowDocument = new TypedDocumentString(`
mutation CreateFlow($botID: BotID!, $platform: Platform!) {
  createFlow(botID: $botID, platform: $platform) {
    id
    flowsWithoutGroup {
      ...FlowListItem
    }
  }
}
${FlowListItemFragmentDoc}`) as unknown as TypedDocumentString<CreateFlowMutation, CreateFlowMutationVariables>;
export const RenameFlowDocument = new TypedDocumentString(`
mutation RenameFlow($flowID: FlowID!, $name: String!) {
  updateFlowName(flowID: $flowID, name: $name) {
    id
    name
  }
}`) as unknown as TypedDocumentString<RenameFlowMutation, RenameFlowMutationVariables>;
export const DeleteFlowDocument = new TypedDocumentString(`
mutation DeleteFlow($flowID: FlowID!) {
  deleteFlow(flowID: $flowID) {
    id
    flowGroups {
      id
      flows {
        id
      }
    }
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<DeleteFlowMutation, DeleteFlowMutationVariables>;
export const CreateFlowGroupDocument = new TypedDocumentString(`
mutation CreateFlowGroup($botID: BotID!) {
  createFlowGroup(botID: $botID) {
    id
    flowGroups {
      id
      name
    }
  }
}`) as unknown as TypedDocumentString<CreateFlowGroupMutation, CreateFlowGroupMutationVariables>;
export const RenameFlowGroupDocument = new TypedDocumentString(`
mutation RenameFlowGroup($groupID: FlowGroupID!, $name: String!) {
  updateFlowGroupName(id: $groupID, name: $name) {
    id
    name
  }
}`) as unknown as TypedDocumentString<RenameFlowGroupMutation, RenameFlowGroupMutationVariables>;
export const DeleteFlowGroupDocument = new TypedDocumentString(`
mutation DeleteFlowGroup($groupID: FlowGroupID!) {
  deleteFlowGroup(flowGroupId: $groupID) {
    id
    flowGroups {
      id
    }
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<DeleteFlowGroupMutation, DeleteFlowGroupMutationVariables>;
export const MoveFlowToGroupDocument = new TypedDocumentString(`
mutation MoveFlowToGroup($flowID: FlowID!, $groupID: FlowGroupID!) {
  moveFlowToGroup(flowID: $flowID, groupID: $groupID) {
    id
    flowGroups {
      id
      flows {
        id
      }
    }
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<MoveFlowToGroupMutation, MoveFlowToGroupMutationVariables>;
export const RemoveFlowFromGroupDocument = new TypedDocumentString(`
mutation RemoveFlowFromGroup($flowID: FlowID!) {
  removeFlowFromGroup(flowID: $flowID) {
    id
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<RemoveFlowFromGroupMutation, RemoveFlowFromGroupMutationVariables>;
export const SortFlowGroupsDocument = new TypedDocumentString(`
mutation SortFlowGroups($botID: BotID!, $flowGroupIDs: [FlowGroupID!]!) {
  sortFlowGroups(botID: $botID, flowGroupIds: $flowGroupIDs) {
    id
    flowGroups {
      id
    }
  }
}`) as unknown as TypedDocumentString<SortFlowGroupsMutation, SortFlowGroupsMutationVariables>;
export const SortFlowsInGroupDocument = new TypedDocumentString(`
mutation SortFlowsInGroup($groupID: FlowGroupID!, $flowIDs: [FlowID!]!) {
  sortFlowsInGroup(groupID: $groupID, flowIds: $flowIDs) {
    id
    flows {
      id
    }
  }
}`) as unknown as TypedDocumentString<SortFlowsInGroupMutation, SortFlowsInGroupMutationVariables>;
export const SortUngroupedFlowsDocument = new TypedDocumentString(`
mutation SortUngroupedFlows($botID: BotID!, $flowIDs: [FlowID!]!) {
  sortUngroupedFlows(botID: $botID, flowIds: $flowIDs) {
    id
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<SortUngroupedFlowsMutation, SortUngroupedFlowsMutationVariables>;
export const MoveBlockDocument = new TypedDocumentString(`
mutation MoveBlock($flowID: FlowID!, $blockID: BlockID!, $x: Int!, $y: Int!) {
  updateBlockPosition(
    flowID: $flowID
    blockID: $blockID
    positionX: $x
    positionY: $y
  ) {
    id
    positionX
    positionY
  }
}`) as unknown as TypedDocumentString<MoveBlockMutation, MoveBlockMutationVariables>;
export const MoveBlocksBulkDocument = new TypedDocumentString(`
mutation MoveBlocksBulk($flowID: FlowID!, $update: [BlockPositionBulkUpdate!]!) {
  updateBlockPositionBulk(flowID: $flowID, update: $update) {
    id
    blocks {
      id
      positionX
      positionY
    }
  }
}`) as unknown as TypedDocumentString<MoveBlocksBulkMutation, MoveBlocksBulkMutationVariables>;
export const RenameBlockDocument = new TypedDocumentString(`
mutation RenameBlock($flowID: FlowID!, $blockID: BlockID!, $name: String!) {
  updateBlockName(flowID: $flowID, blockID: $blockID, name: $name) {
    id
    name
  }
}`) as unknown as TypedDocumentString<RenameBlockMutation, RenameBlockMutationVariables>;
export const DeleteBlockDocument = new TypedDocumentString(`
mutation DeleteBlock($flowID: FlowID!, $blockID: BlockID!) {
  deleteBlock(flowID: $flowID, blockID: $blockID) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteBlockMutation, DeleteBlockMutationVariables>;
export const SetStartingPointDocument = new TypedDocumentString(`
mutation SetStartingPoint($flowID: FlowID!, $blockID: BlockID!) {
  blockSetStartingPoint(flowID: $flowID, blockID: $blockID) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<SetStartingPointMutation, SetStartingPointMutationVariables>;
export const EnableEntryPointDocument = new TypedDocumentString(`
mutation EnableEntryPoint($flowID: FlowID!, $blockID: BlockID!) {
  blockEnableEntryPoint(flowID: $flowID, blockID: $blockID) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<EnableEntryPointMutation, EnableEntryPointMutationVariables>;
export const DisableEntryPointDocument = new TypedDocumentString(`
mutation DisableEntryPoint($flowID: FlowID!, $blockID: BlockID!) {
  blockDisableEntryPoint(flowID: $flowID, blockID: $blockID) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<DisableEntryPointMutation, DisableEntryPointMutationVariables>;
export const DeleteElementDocument = new TypedDocumentString(`
mutation DeleteElement($botID: BotID!, $elementID: BlockElementID!) {
  blockElementDelete(botID: $botID, elementID: $elementID) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteElementMutation, DeleteElementMutationVariables>;
export const SortElementsDocument = new TypedDocumentString(`
mutation SortElements($blockID: BlockID!, $elementIDs: [BlockElementID!]!) {
  sortBlockElements(blockID: $blockID, elementIDs: $elementIDs) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SortElementsMutation, SortElementsMutationVariables>;
export const AddWidgetTextAndButtonsToBlockDocument = new TypedDocumentString(`
mutation AddWidgetTextAndButtonsToBlock($blockID: BlockID!) {
  widgetTextAndButtonsCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWidgetTextAndButtonsToBlockMutation, AddWidgetTextAndButtonsToBlockMutationVariables>;
export const AddWidgetImageToBlockDocument = new TypedDocumentString(`
mutation AddWidgetImageToBlock($blockID: BlockID!) {
  widgetImageCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWidgetImageToBlockMutation, AddWidgetImageToBlockMutationVariables>;
export const AddWhatsAppImageToBlockDocument = new TypedDocumentString(`
mutation AddWhatsAppImageToBlock($blockID: BlockID!) {
  whatsAppImageCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppImageToBlockMutation, AddWhatsAppImageToBlockMutationVariables>;
export const AddWhatsAppVideoToBlockDocument = new TypedDocumentString(`
mutation AddWhatsAppVideoToBlock($blockID: BlockID!) {
  whatsAppVideoCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppVideoToBlockMutation, AddWhatsAppVideoToBlockMutationVariables>;
export const AddWhatsAppAudioToBlockDocument = new TypedDocumentString(`
mutation AddWhatsAppAudioToBlock($blockID: BlockID!) {
  whatsAppAudioCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppAudioToBlockMutation, AddWhatsAppAudioToBlockMutationVariables>;
export const AddWhatsAppDocumentToBlockDocument = new TypedDocumentString(`
mutation AddWhatsAppDocumentToBlock($blockID: BlockID!) {
  whatsAppDocumentCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppDocumentToBlockMutation, AddWhatsAppDocumentToBlockMutationVariables>;
export const AddSetConditionToBlockDocument = new TypedDocumentString(`
mutation AddSetConditionToBlock($blockID: BlockID!) {
  setConditionCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSetConditionToBlockMutation, AddSetConditionToBlockMutationVariables>;
export const AddSetContactPropertyToBlockDocument = new TypedDocumentString(`
mutation AddSetContactPropertyToBlock($blockID: BlockID!) {
  setContactPropertyCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSetContactPropertyToBlockMutation, AddSetContactPropertyToBlockMutationVariables>;
export const AddClearContactPropertyToBlockDocument = new TypedDocumentString(`
mutation AddClearContactPropertyToBlock($blockID: BlockID!) {
  clearContactPropertyCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddClearContactPropertyToBlockMutation, AddClearContactPropertyToBlockMutationVariables>;
export const AddSendJsonToBlockDocument = new TypedDocumentString(`
mutation AddSendJsonToBlock($blockID: BlockID!) {
  sendJsonCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSendJsonToBlockMutation, AddSendJsonToBlockMutationVariables>;
export const AddSummarizeChatToBlockDocument = new TypedDocumentString(`
mutation AddSummarizeChatToBlock($blockID: BlockID!) {
  summarizeChatCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSummarizeChatToBlockMutation, AddSummarizeChatToBlockMutationVariables>;
export const AddWidgetSwitchToHumanToBlockDocument = new TypedDocumentString(`
mutation AddWidgetSwitchToHumanToBlock($blockID: BlockID!) {
  widgetSwitchToChatWithHumanAgentCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWidgetSwitchToHumanToBlockMutation, AddWidgetSwitchToHumanToBlockMutationVariables>;
export const AddWhatsAppSwitchToHumanToBlockDocument = new TypedDocumentString(`
mutation AddWhatsAppSwitchToHumanToBlock($blockID: BlockID!) {
  whatsAppSwitchToChatWithHumanAgentCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppSwitchToHumanToBlockMutation, AddWhatsAppSwitchToHumanToBlockMutationVariables>;
export const AddInstagramSwitchToHumanToBlockDocument = new TypedDocumentString(`
mutation AddInstagramSwitchToHumanToBlock($blockID: BlockID!) {
  instagramSwitchToChatWithHumanAgentCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddInstagramSwitchToHumanToBlockMutation, AddInstagramSwitchToHumanToBlockMutationVariables>;
export const AddTikTokSwitchToHumanToBlockDocument = new TypedDocumentString(`
mutation AddTikTokSwitchToHumanToBlock($blockID: BlockID!) {
  tiktokSwitchToChatWithHumanAgentCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddTikTokSwitchToHumanToBlockMutation, AddTikTokSwitchToHumanToBlockMutationVariables>;
export const ConnectBlocksDocument = new TypedDocumentString(`
mutation ConnectBlocks($flowID: FlowID!, $request: BlockToBlockConnectionCreateRequest!) {
  blockToBlockConnectionCreateOrUpdate(flowID: $flowID, request: $request) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<ConnectBlocksMutation, ConnectBlocksMutationVariables>;
export const ConnectComponentDocument = new TypedDocumentString(`
mutation ConnectComponent($flowID: FlowID!, $request: ComponentToBlockConnectionCreateRequest!) {
  componentToBlockConnectionCreateOrUpdate(flowID: $flowID, request: $request) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<ConnectComponentMutation, ConnectComponentMutationVariables>;
export const DisconnectBlocksDocument = new TypedDocumentString(`
mutation DisconnectBlocks($flowID: FlowID!, $sourceBlockID: BlockID!) {
  blockToBlockConnectionDelete(flowID: $flowID, sourceBlockID: $sourceBlockID) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<DisconnectBlocksMutation, DisconnectBlocksMutationVariables>;
export const DisconnectComponentDocument = new TypedDocumentString(`
mutation DisconnectComponent($flowID: FlowID!, $sourceBlockElementID: BlockElementID!, $sourceHandleID: ComponentHandleID!) {
  componentToBlockConnectionDelete(
    flowID: $flowID
    sourceBlockElementID: $sourceBlockElementID
    sourceHandleID: $sourceHandleID
  ) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<DisconnectComponentMutation, DisconnectComponentMutationVariables>;
export const CreateWhatsAppTextBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppTextBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppTextCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTextBlockMutation, CreateWhatsAppTextBlockMutationVariables>;
export const CreateWhatsAppTextBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppTextBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppTextCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTextBlockConnectedMutation, CreateWhatsAppTextBlockConnectedMutationVariables>;
export const AddWhatsAppTextToBlockDocument = new TypedDocumentString(`
mutation AddWhatsAppTextToBlock($blockID: BlockID!) {
  whatsAppTextCreateInBlock(blockID: $blockID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppTextToBlockMutation, AddWhatsAppTextToBlockMutationVariables>;
export const CreateWidgetTextAndButtonsBlockDocument = new TypedDocumentString(`
mutation CreateWidgetTextAndButtonsBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  widgetTextAndButtonsCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetTextAndButtonsBlockMutation, CreateWidgetTextAndButtonsBlockMutationVariables>;
export const CreateWidgetEntryPointDocument = new TypedDocumentString(`
mutation CreateWidgetEntryPoint($flowID: FlowID!, $x: Int!, $y: Int!) {
  widgetEPCreate(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetEntryPointMutation, CreateWidgetEntryPointMutationVariables>;
export const CreateAiAgentBlockDocument = new TypedDocumentString(`
mutation CreateAiAgentBlock($flowID: FlowID!, $x: Int!, $y: Int!, $templateID: AiAgentTemplateID!) {
  aiAgentCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
    templateID: $templateID
  ) {
    ...FlowParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}
${ConnectionPartsFragmentDoc}
${FlowPartsFragmentDoc}`) as unknown as TypedDocumentString<CreateAiAgentBlockMutation, CreateAiAgentBlockMutationVariables>;
export const CreateWidgetImageBlockDocument = new TypedDocumentString(`
mutation CreateWidgetImageBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  widgetImageCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetImageBlockMutation, CreateWidgetImageBlockMutationVariables>;
export const CreateWidgetSwitchToHumanBlockDocument = new TypedDocumentString(`
mutation CreateWidgetSwitchToHumanBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  widgetSwitchToChatWithHumanAgentCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetSwitchToHumanBlockMutation, CreateWidgetSwitchToHumanBlockMutationVariables>;
export const CreateWhatsAppImageBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppImageBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppImageCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppImageBlockMutation, CreateWhatsAppImageBlockMutationVariables>;
export const CreateWhatsAppVideoBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppVideoBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppVideoCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppVideoBlockMutation, CreateWhatsAppVideoBlockMutationVariables>;
export const CreateWhatsAppAudioBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppAudioBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppAudioCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppAudioBlockMutation, CreateWhatsAppAudioBlockMutationVariables>;
export const CreateWhatsAppDocumentBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppDocumentBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppDocumentCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppDocumentBlockMutation, CreateWhatsAppDocumentBlockMutationVariables>;
export const CreateWhatsAppTextAndButtonsBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppTextAndButtonsBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppTextAndButtonsCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTextAndButtonsBlockMutation, CreateWhatsAppTextAndButtonsBlockMutationVariables>;
export const CreateWhatsAppTextAndUrlBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppTextAndURLBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppTextAndURLCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTextAndUrlBlockMutation, CreateWhatsAppTextAndUrlBlockMutationVariables>;
export const CreateWhatsAppListBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppListBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppListCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppListBlockMutation, CreateWhatsAppListBlockMutationVariables>;
export const CreateWhatsAppTemplateBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppTemplateBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppTemplateCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTemplateBlockMutation, CreateWhatsAppTemplateBlockMutationVariables>;
export const CreateWhatsAppSwitchToHumanBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppSwitchToHumanBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppSwitchToChatWithHumanAgentCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppSwitchToHumanBlockMutation, CreateWhatsAppSwitchToHumanBlockMutationVariables>;
export const CreateInstagramSwitchToHumanBlockDocument = new TypedDocumentString(`
mutation CreateInstagramSwitchToHumanBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  instagramSwitchToChatWithHumanAgentCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateInstagramSwitchToHumanBlockMutation, CreateInstagramSwitchToHumanBlockMutationVariables>;
export const CreateTikTokSwitchToHumanBlockDocument = new TypedDocumentString(`
mutation CreateTikTokSwitchToHumanBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  tiktokSwitchToChatWithHumanAgentCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateTikTokSwitchToHumanBlockMutation, CreateTikTokSwitchToHumanBlockMutationVariables>;
export const CreateSetConditionBlockDocument = new TypedDocumentString(`
mutation CreateSetConditionBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  setConditionCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSetConditionBlockMutation, CreateSetConditionBlockMutationVariables>;
export const CreateSetContactPropertyBlockDocument = new TypedDocumentString(`
mutation CreateSetContactPropertyBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  setContactPropertyCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSetContactPropertyBlockMutation, CreateSetContactPropertyBlockMutationVariables>;
export const CreateClearContactPropertyBlockDocument = new TypedDocumentString(`
mutation CreateClearContactPropertyBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  clearContactPropertyCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateClearContactPropertyBlockMutation, CreateClearContactPropertyBlockMutationVariables>;
export const CreateSendJsonBlockDocument = new TypedDocumentString(`
mutation CreateSendJsonBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  sendJsonCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSendJsonBlockMutation, CreateSendJsonBlockMutationVariables>;
export const CreateSummarizeChatBlockDocument = new TypedDocumentString(`
mutation CreateSummarizeChatBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  summarizeChatCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSummarizeChatBlockMutation, CreateSummarizeChatBlockMutationVariables>;
export const CreateRedirectToFlowBlockDocument = new TypedDocumentString(`
mutation CreateRedirectToFlowBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  redirectToFlowCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateRedirectToFlowBlockMutation, CreateRedirectToFlowBlockMutationVariables>;
export const CreateTriggeredMessageBlockDocument = new TypedDocumentString(`
mutation CreateTriggeredMessageBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  triggeredMessageCreateWithBlock(flowID: $flowID, positionX: $x, positionY: $y) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateTriggeredMessageBlockMutation, CreateTriggeredMessageBlockMutationVariables>;
export const CreateWhatsAppOneTimeNotificationBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppOneTimeNotificationBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppOneTimeNotificationCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppOneTimeNotificationBlockMutation, CreateWhatsAppOneTimeNotificationBlockMutationVariables>;
export const CreateWhatsAppScheduledMessageBlockDocument = new TypedDocumentString(`
mutation CreateWhatsAppScheduledMessageBlock($flowID: FlowID!, $x: Int!, $y: Int!) {
  whatsAppScheduledMessageCreateWithBlock(
    flowID: $flowID
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppScheduledMessageBlockMutation, CreateWhatsAppScheduledMessageBlockMutationVariables>;
export const CreateWidgetTextAndButtonsBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWidgetTextAndButtonsBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  widgetTextAndButtonsCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetTextAndButtonsBlockConnectedMutation, CreateWidgetTextAndButtonsBlockConnectedMutationVariables>;
export const CreateWidgetImageBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWidgetImageBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  widgetImageCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetImageBlockConnectedMutation, CreateWidgetImageBlockConnectedMutationVariables>;
export const CreateWidgetSwitchToHumanBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWidgetSwitchToHumanBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  widgetSwitchToChatWithHumanAgentCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWidgetSwitchToHumanBlockConnectedMutation, CreateWidgetSwitchToHumanBlockConnectedMutationVariables>;
export const CreateWhatsAppImageBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppImageBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppImageCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppImageBlockConnectedMutation, CreateWhatsAppImageBlockConnectedMutationVariables>;
export const CreateWhatsAppVideoBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppVideoBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppVideoCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppVideoBlockConnectedMutation, CreateWhatsAppVideoBlockConnectedMutationVariables>;
export const CreateWhatsAppAudioBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppAudioBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppAudioCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppAudioBlockConnectedMutation, CreateWhatsAppAudioBlockConnectedMutationVariables>;
export const CreateWhatsAppDocumentBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppDocumentBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppDocumentCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppDocumentBlockConnectedMutation, CreateWhatsAppDocumentBlockConnectedMutationVariables>;
export const CreateWhatsAppTextAndButtonsBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppTextAndButtonsBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppTextAndButtonsCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTextAndButtonsBlockConnectedMutation, CreateWhatsAppTextAndButtonsBlockConnectedMutationVariables>;
export const CreateWhatsAppTextAndUrlBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppTextAndURLBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppTextAndURLCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTextAndUrlBlockConnectedMutation, CreateWhatsAppTextAndUrlBlockConnectedMutationVariables>;
export const CreateWhatsAppListBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppListBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppListCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppListBlockConnectedMutation, CreateWhatsAppListBlockConnectedMutationVariables>;
export const CreateWhatsAppTemplateBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppTemplateBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppTemplateCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppTemplateBlockConnectedMutation, CreateWhatsAppTemplateBlockConnectedMutationVariables>;
export const CreateWhatsAppSwitchToHumanBlockConnectedDocument = new TypedDocumentString(`
mutation CreateWhatsAppSwitchToHumanBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  whatsAppSwitchToChatWithHumanAgentCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateWhatsAppSwitchToHumanBlockConnectedMutation, CreateWhatsAppSwitchToHumanBlockConnectedMutationVariables>;
export const CreateInstagramSwitchToHumanBlockConnectedDocument = new TypedDocumentString(`
mutation CreateInstagramSwitchToHumanBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  instagramSwitchToChatWithHumanAgentCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateInstagramSwitchToHumanBlockConnectedMutation, CreateInstagramSwitchToHumanBlockConnectedMutationVariables>;
export const CreateTikTokSwitchToHumanBlockConnectedDocument = new TypedDocumentString(`
mutation CreateTikTokSwitchToHumanBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  tiktokSwitchToChatWithHumanAgentCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateTikTokSwitchToHumanBlockConnectedMutation, CreateTikTokSwitchToHumanBlockConnectedMutationVariables>;
export const CreateSetConditionBlockConnectedDocument = new TypedDocumentString(`
mutation CreateSetConditionBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  setConditionCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSetConditionBlockConnectedMutation, CreateSetConditionBlockConnectedMutationVariables>;
export const CreateSetContactPropertyBlockConnectedDocument = new TypedDocumentString(`
mutation CreateSetContactPropertyBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  setContactPropertyCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSetContactPropertyBlockConnectedMutation, CreateSetContactPropertyBlockConnectedMutationVariables>;
export const CreateClearContactPropertyBlockConnectedDocument = new TypedDocumentString(`
mutation CreateClearContactPropertyBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  clearContactPropertyCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateClearContactPropertyBlockConnectedMutation, CreateClearContactPropertyBlockConnectedMutationVariables>;
export const CreateSendJsonBlockConnectedDocument = new TypedDocumentString(`
mutation CreateSendJsonBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  sendJsonCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSendJsonBlockConnectedMutation, CreateSendJsonBlockConnectedMutationVariables>;
export const CreateSummarizeChatBlockConnectedDocument = new TypedDocumentString(`
mutation CreateSummarizeChatBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  summarizeChatCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateSummarizeChatBlockConnectedMutation, CreateSummarizeChatBlockConnectedMutationVariables>;
export const CreateRedirectToFlowBlockConnectedDocument = new TypedDocumentString(`
mutation CreateRedirectToFlowBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!) {
  redirectToFlowCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateRedirectToFlowBlockConnectedMutation, CreateRedirectToFlowBlockConnectedMutationVariables>;
export const CreateAiAgentBlockConnectedDocument = new TypedDocumentString(`
mutation CreateAiAgentBlockConnected($flowID: FlowID!, $request: UndefinedTargetBlockConnectionCreateRequest!, $x: Int!, $y: Int!, $templateID: AiAgentTemplateID!) {
  aiAgentCreateWithBlockAndConnection(
    flowID: $flowID
    request: $request
    positionX: $x
    positionY: $y
    templateID: $templateID
  ) {
    ...FlowBlocksSlim
  }
}
${FlowBlocksSlimFragmentDoc}`) as unknown as TypedDocumentString<CreateAiAgentBlockConnectedMutation, CreateAiAgentBlockConnectedMutationVariables>;
export const SetWhatsAppTextDocument = new TypedDocumentString(`
mutation SetWhatsAppText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextSetText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextMutation, SetWhatsAppTextMutationVariables>;
export const SetWidgetTextAndButtonsTextDocument = new TypedDocumentString(`
mutation SetWidgetTextAndButtonsText($elementID: BlockElementID!, $text: String!) {
  widgetTextAndButtonsSetText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetTextAndButtonsTextMutation, SetWidgetTextAndButtonsTextMutationVariables>;
export const SetWhatsAppTextAndButtonsBodyTextDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndButtonsBodyText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextAndButtonsSetBodyText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndButtonsBodyTextMutation, SetWhatsAppTextAndButtonsBodyTextMutationVariables>;
export const AddWidgetContinueFlowButtonDocument = new TypedDocumentString(`
mutation AddWidgetContinueFlowButton($elementID: BlockElementID!) {
  widgetTextAndButtonsAddNewContinueFlowButton(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWidgetContinueFlowButtonMutation, AddWidgetContinueFlowButtonMutationVariables>;
export const AddWidgetOpenUrlButtonDocument = new TypedDocumentString(`
mutation AddWidgetOpenURLButton($elementID: BlockElementID!) {
  widgetTextAndButtonsAddNewOpenURLButton(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWidgetOpenUrlButtonMutation, AddWidgetOpenUrlButtonMutationVariables>;
export const SetWidgetButtonTitleDocument = new TypedDocumentString(`
mutation SetWidgetButtonTitle($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $title: String!) {
  widgetTextAndButtonsSetButtonTitle(
    blockElementID: $elementID
    buttonID: $buttonID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetButtonTitleMutation, SetWidgetButtonTitleMutationVariables>;
export const SetWidgetButtonUrlDocument = new TypedDocumentString(`
mutation SetWidgetButtonURL($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $url: String!) {
  widgetTextAndButtonsSetButtonURL(
    blockElementID: $elementID
    buttonID: $buttonID
    url: $url
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetButtonUrlMutation, SetWidgetButtonUrlMutationVariables>;
export const MoveWidgetButtonsDocument = new TypedDocumentString(`
mutation MoveWidgetButtons($elementID: BlockElementID!, $orderedButtonIDs: [ComponentHandleID!]!) {
  widgetTextAndButtonsMoveButton(
    blockElementID: $elementID
    orderedButtonIDs: $orderedButtonIDs
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<MoveWidgetButtonsMutation, MoveWidgetButtonsMutationVariables>;
export const DeleteWidgetButtonDocument = new TypedDocumentString(`
mutation DeleteWidgetButton($elementID: BlockElementID!, $buttonID: ComponentHandleID!) {
  widgetTextAndButtonsDeleteButton(
    blockElementID: $elementID
    buttonID: $buttonID
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteWidgetButtonMutation, DeleteWidgetButtonMutationVariables>;
export const AddWhatsAppContinueFlowButtonDocument = new TypedDocumentString(`
mutation AddWhatsAppContinueFlowButton($elementID: BlockElementID!) {
  whatsAppTextAndButtonsAddNewContinueFlowButton(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWhatsAppContinueFlowButtonMutation, AddWhatsAppContinueFlowButtonMutationVariables>;
export const SetWhatsAppButtonTitleDocument = new TypedDocumentString(`
mutation SetWhatsAppButtonTitle($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $title: String!) {
  whatsAppTextAndButtonsSetButtonTitle(
    blockElementID: $elementID
    buttonID: $buttonID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppButtonTitleMutation, SetWhatsAppButtonTitleMutationVariables>;
export const AddWaListRowDocument = new TypedDocumentString(`
mutation AddWAListRow($elementID: BlockElementID!) {
  whatsAppListAddRow(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWaListRowMutation, AddWaListRowMutationVariables>;
export const SetWaListRowTitleDocument = new TypedDocumentString(`
mutation SetWAListRowTitle($elementID: BlockElementID!, $rowID: ComponentHandleID!, $title: String!) {
  whatsAppListSetRowTitle(
    blockElementID: $elementID
    rowID: $rowID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWaListRowTitleMutation, SetWaListRowTitleMutationVariables>;
export const ReorderWaListRowsDocument = new TypedDocumentString(`
mutation ReorderWAListRows($elementID: BlockElementID!, $orderedRowIDs: [ComponentHandleID!]!) {
  whatsAppListReorderRows(
    blockElementID: $elementID
    orderedRowIDs: $orderedRowIDs
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<ReorderWaListRowsMutation, ReorderWaListRowsMutationVariables>;
export const SetWhatsAppImageFileDocument = new TypedDocumentString(`
mutation SetWhatsAppImageFile($elementID: BlockElementID!, $fileID: FileID!) {
  whatsAppImageSetImageFile(blockElementID: $elementID, fileID: $fileID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppImageFileMutation, SetWhatsAppImageFileMutationVariables>;
export const SetWhatsAppVideoFileDocument = new TypedDocumentString(`
mutation SetWhatsAppVideoFile($elementID: BlockElementID!, $fileID: FileID!, $fileName: String!) {
  whatsAppVideoSetVideoFile(
    blockElementID: $elementID
    fileID: $fileID
    fileName: $fileName
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppVideoFileMutation, SetWhatsAppVideoFileMutationVariables>;
export const SetWhatsAppTextWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppTextWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppTextSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextWaitForRepliesMutation, SetWhatsAppTextWaitForRepliesMutationVariables>;
export const SetWhatsAppTextSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppTextSaveReply($elementID: BlockElementID!, $saveContactReply: Boolean!, $attribute: AttributeName) {
  whatsAppTextSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $saveContactReply
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextSaveReplyMutation, SetWhatsAppTextSaveReplyMutationVariables>;
export const SetConditionSegmentDocument = new TypedDocumentString(`
mutation SetConditionSegment($elementID: BlockElementID!, $request: SegmentInput!) {
  setConditionUpdateSegment(blockElementID: $elementID, request: $request) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetConditionSegmentMutation, SetConditionSegmentMutationVariables>;
export const SetContactPropertyAttributeDocument = new TypedDocumentString(`
mutation SetContactPropertyAttribute($elementID: BlockElementID!, $name: AttributeName!) {
  setContactPropertySetAttribute(blockElementID: $elementID, name: $name) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetContactPropertyAttributeMutation, SetContactPropertyAttributeMutationVariables>;
export const SetContactPropertyValueDocument = new TypedDocumentString(`
mutation SetContactPropertyValue($elementID: BlockElementID!, $value: String!) {
  setContactPropertySetValue(blockElementID: $elementID, value: $value) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetContactPropertyValueMutation, SetContactPropertyValueMutationVariables>;
export const SetRedirectTargetFlowDocument = new TypedDocumentString(`
mutation SetRedirectTargetFlow($elementID: BlockElementID!, $targetFlowID: FlowID!) {
  redirectToFlowSetTargetFlow(
    blockElementID: $elementID
    targetFlowID: $targetFlowID
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetRedirectTargetFlowMutation, SetRedirectTargetFlowMutationVariables>;
export const SetSendJsonUrlDocument = new TypedDocumentString(`
mutation SetSendJsonURL($elementID: BlockElementID!, $url: String!) {
  sendJsonUpdateURL(blockElementID: $elementID, url: $url) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonUrlMutation, SetSendJsonUrlMutationVariables>;
export const SetSendJsonMethodDocument = new TypedDocumentString(`
mutation SetSendJsonMethod($elementID: BlockElementID!, $method: SendJsonHTTPMethod!) {
  sendJsonUpdateHTTPMethod(blockElementID: $elementID, method: $method) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonMethodMutation, SetSendJsonMethodMutationVariables>;
export const AddSendJsonHeaderDocument = new TypedDocumentString(`
mutation AddSendJsonHeader($elementID: BlockElementID!) {
  sendJsonAddHeader(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSendJsonHeaderMutation, AddSendJsonHeaderMutationVariables>;
export const TestSendJsonRequestDocument = new TypedDocumentString(`
mutation TestSendJsonRequest($elementID: BlockElementID!) {
  sendJsonTestRequest(blockElementID: $elementID) {
    statusCode
    statusName
    requestURL
    requestMethod
    requestBody
    requestHeaders {
      header
      value
    }
    responseBody
    responseHeaders {
      header
      value
    }
  }
}`) as unknown as TypedDocumentString<TestSendJsonRequestMutation, TestSendJsonRequestMutationVariables>;
export const SetAiAgentInstructionsDocument = new TypedDocumentString(`
mutation SetAiAgentInstructions($elementID: BlockElementID!, $instructions: String!) {
  aiAgentUpdateAdditionalInstructions(
    blockElementID: $elementID
    additionalInstructions: $instructions
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentInstructionsMutation, SetAiAgentInstructionsMutationVariables>;
export const AddAiAgentRuleDocument = new TypedDocumentString(`
mutation AddAiAgentRule($elementID: BlockElementID!) {
  aiAgentCreateRule(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddAiAgentRuleMutation, AddAiAgentRuleMutationVariables>;
export const SetAiAgentRuleTitleDocument = new TypedDocumentString(`
mutation SetAiAgentRuleTitle($elementID: BlockElementID!, $ruleID: ComponentHandleID!, $title: String!) {
  aiAgentUpdateRuleTitle(
    blockElementID: $elementID
    ruleID: $ruleID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentRuleTitleMutation, SetAiAgentRuleTitleMutationVariables>;
export const SetAiAgentRulePromptDocument = new TypedDocumentString(`
mutation SetAiAgentRulePrompt($elementID: BlockElementID!, $ruleID: ComponentHandleID!, $prompt: String!) {
  aiAgentUpdateRulePrompt(
    blockElementID: $elementID
    ruleID: $ruleID
    prompt: $prompt
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentRulePromptMutation, SetAiAgentRulePromptMutationVariables>;
export const DeleteAiAgentRuleDocument = new TypedDocumentString(`
mutation DeleteAiAgentRule($elementID: BlockElementID!, $ruleID: ComponentHandleID!) {
  aiAgentDeleteRule(blockElementID: $elementID, ruleID: $ruleID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteAiAgentRuleMutation, DeleteAiAgentRuleMutationVariables>;
export const SetAiAgentCustomPromptDocument = new TypedDocumentString(`
mutation SetAiAgentCustomPrompt($elementID: BlockElementID!, $prompt: String!) {
  aiAgentCustomUpdatePrompt(blockElementID: $elementID, prompt: $prompt) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentCustomPromptMutation, SetAiAgentCustomPromptMutationVariables>;
export const SetAttributeDefaultValueDocument = new TypedDocumentString(`
mutation SetAttributeDefaultValue($botID: BotID!, $attributeName: AttributeName!, $defaultValue: String!) {
  botAttributeUpdateDefaultVal(
    botID: $botID
    attributeName: $attributeName
    defaultValue: $defaultValue
  ) {
    id
  }
}`) as unknown as TypedDocumentString<SetAttributeDefaultValueMutation, SetAttributeDefaultValueMutationVariables>;
export const SetWhatsAppImageCaptionDocument = new TypedDocumentString(`
mutation SetWhatsAppImageCaption($elementID: BlockElementID!, $caption: String!) {
  whatsAppImageSetCaption(blockElementID: $elementID, caption: $caption) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppImageCaptionMutation, SetWhatsAppImageCaptionMutationVariables>;
export const SetWhatsAppImageWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppImageWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppImageSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppImageWaitForRepliesMutation, SetWhatsAppImageWaitForRepliesMutationVariables>;
export const SetWhatsAppImageSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppImageSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppImageSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppImageSaveReplyMutation, SetWhatsAppImageSaveReplyMutationVariables>;
export const SetWhatsAppVideoCaptionDocument = new TypedDocumentString(`
mutation SetWhatsAppVideoCaption($elementID: BlockElementID!, $caption: String!) {
  whatsAppVideoSetCaption(blockElementID: $elementID, caption: $caption) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppVideoCaptionMutation, SetWhatsAppVideoCaptionMutationVariables>;
export const SetWhatsAppVideoWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppVideoWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppVideoSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppVideoWaitForRepliesMutation, SetWhatsAppVideoWaitForRepliesMutationVariables>;
export const SetWhatsAppVideoSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppVideoSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppVideoSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppVideoSaveReplyMutation, SetWhatsAppVideoSaveReplyMutationVariables>;
export const SetWhatsAppAudioFileDocument = new TypedDocumentString(`
mutation SetWhatsAppAudioFile($elementID: BlockElementID!, $fileID: FileID!, $fileName: String!) {
  whatsAppAudioSetAudioFile(
    blockElementID: $elementID
    fileID: $fileID
    fileName: $fileName
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppAudioFileMutation, SetWhatsAppAudioFileMutationVariables>;
export const SetWhatsAppAudioWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppAudioWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppAudioSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppAudioWaitForRepliesMutation, SetWhatsAppAudioWaitForRepliesMutationVariables>;
export const SetWhatsAppAudioSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppAudioSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppAudioSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppAudioSaveReplyMutation, SetWhatsAppAudioSaveReplyMutationVariables>;
export const SetWhatsAppDocumentFileDocument = new TypedDocumentString(`
mutation SetWhatsAppDocumentFile($elementID: BlockElementID!, $fileID: FileID!, $fileName: String!) {
  whatsAppDocumentSetDocumentFile(
    blockElementID: $elementID
    fileID: $fileID
    fileName: $fileName
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppDocumentFileMutation, SetWhatsAppDocumentFileMutationVariables>;
export const SetWhatsAppDocumentCaptionDocument = new TypedDocumentString(`
mutation SetWhatsAppDocumentCaption($elementID: BlockElementID!, $caption: String!) {
  whatsAppDocumentSetCaption(blockElementID: $elementID, caption: $caption) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppDocumentCaptionMutation, SetWhatsAppDocumentCaptionMutationVariables>;
export const SetWhatsAppDocumentWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppDocumentWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppDocumentSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppDocumentWaitForRepliesMutation, SetWhatsAppDocumentWaitForRepliesMutationVariables>;
export const SetWhatsAppDocumentSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppDocumentSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppDocumentSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppDocumentSaveReplyMutation, SetWhatsAppDocumentSaveReplyMutationVariables>;
export const SetWidgetImageFileDocument = new TypedDocumentString(`
mutation SetWidgetImageFile($elementID: BlockElementID!, $fileID: FileID!) {
  widgetImageSetImageFile(blockElementID: $elementID, fileID: $fileID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetImageFileMutation, SetWidgetImageFileMutationVariables>;
export const SetWidgetImageWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWidgetImageWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  widgetImageSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetImageWaitForRepliesMutation, SetWidgetImageWaitForRepliesMutationVariables>;
export const SetWidgetImageSaveReplyDocument = new TypedDocumentString(`
mutation SetWidgetImageSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  widgetImageSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetImageSaveReplyMutation, SetWidgetImageSaveReplyMutationVariables>;
export const AddWidgetPhoneButtonDocument = new TypedDocumentString(`
mutation AddWidgetPhoneButton($elementID: BlockElementID!) {
  widgetTextAndButtonsAddNewPhoneButton(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddWidgetPhoneButtonMutation, AddWidgetPhoneButtonMutationVariables>;
export const SetWidgetButtonPhoneDocument = new TypedDocumentString(`
mutation SetWidgetButtonPhone($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $phone: String!) {
  widgetTextAndButtonsSetButtonPhone(
    blockElementID: $elementID
    buttonID: $buttonID
    phone: $phone
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetButtonPhoneMutation, SetWidgetButtonPhoneMutationVariables>;
export const SetWidgetTextAndButtonsWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWidgetTextAndButtonsWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  widgetTextAndButtonsSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetTextAndButtonsWaitForRepliesMutation, SetWidgetTextAndButtonsWaitForRepliesMutationVariables>;
export const SetWidgetTextAndButtonsSaveReplyDocument = new TypedDocumentString(`
mutation SetWidgetTextAndButtonsSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  widgetTextAndButtonsSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWidgetTextAndButtonsSaveReplyMutation, SetWidgetTextAndButtonsSaveReplyMutationVariables>;
export const SetWhatsAppTextAndButtonsHeaderTextDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndButtonsHeaderText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextAndButtonsSetHeaderText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndButtonsHeaderTextMutation, SetWhatsAppTextAndButtonsHeaderTextMutationVariables>;
export const SetWhatsAppTextAndButtonsFooterTextDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndButtonsFooterText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextAndButtonsSetFooterText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndButtonsFooterTextMutation, SetWhatsAppTextAndButtonsFooterTextMutationVariables>;
export const DeleteWhatsAppButtonDocument = new TypedDocumentString(`
mutation DeleteWhatsAppButton($elementID: BlockElementID!, $buttonID: ComponentHandleID!) {
  whatsAppTextAndButtonsDeleteButton(
    blockElementID: $elementID
    buttonID: $buttonID
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteWhatsAppButtonMutation, DeleteWhatsAppButtonMutationVariables>;
export const MoveWhatsAppButtonsDocument = new TypedDocumentString(`
mutation MoveWhatsAppButtons($elementID: BlockElementID!, $orderedButtonIDs: [ComponentHandleID!]!) {
  whatsAppTextAndButtonsMoveButton(
    blockElementID: $elementID
    orderedButtonIDs: $orderedButtonIDs
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<MoveWhatsAppButtonsMutation, MoveWhatsAppButtonsMutationVariables>;
export const SetWhatsAppTextAndButtonsWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndButtonsWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppTextAndButtonsWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndButtonsWaitForRepliesMutation, SetWhatsAppTextAndButtonsWaitForRepliesMutationVariables>;
export const SetWhatsAppTextAndButtonsSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndButtonsSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppTextAndButtonsSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndButtonsSaveReplyMutation, SetWhatsAppTextAndButtonsSaveReplyMutationVariables>;
export const SetWhatsAppTextAndUrlBodyTextDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLBodyText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextAndURLSetBodyText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlBodyTextMutation, SetWhatsAppTextAndUrlBodyTextMutationVariables>;
export const SetWhatsAppTextAndUrlHeaderTextDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLHeaderText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextAndURLSetHeaderText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlHeaderTextMutation, SetWhatsAppTextAndUrlHeaderTextMutationVariables>;
export const SetWhatsAppTextAndUrlFooterTextDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLFooterText($elementID: BlockElementID!, $text: String!) {
  whatsAppTextAndURLSetFooterText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlFooterTextMutation, SetWhatsAppTextAndUrlFooterTextMutationVariables>;
export const SetWhatsAppTextAndUrlButtonTitleDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLButtonTitle($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $title: String!) {
  whatsAppTextAndURLSetButtonTitle(
    blockElementID: $elementID
    buttonID: $buttonID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlButtonTitleMutation, SetWhatsAppTextAndUrlButtonTitleMutationVariables>;
export const SetWhatsAppTextAndUrlButtonUrlDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLButtonURL($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $url: String!) {
  whatsAppTextAndURLSetButtonURL(
    blockElementID: $elementID
    buttonID: $buttonID
    url: $url
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlButtonUrlMutation, SetWhatsAppTextAndUrlButtonUrlMutationVariables>;
export const SetWhatsAppTextAndUrlWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppTextAndURLWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlWaitForRepliesMutation, SetWhatsAppTextAndUrlWaitForRepliesMutationVariables>;
export const SetWhatsAppTextAndUrlSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppTextAndURLSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppTextAndURLSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTextAndUrlSaveReplyMutation, SetWhatsAppTextAndUrlSaveReplyMutationVariables>;
export const SetWaListBodyTextDocument = new TypedDocumentString(`
mutation SetWAListBodyText($elementID: BlockElementID!, $text: String!) {
  whatsAppListSetBodyText(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWaListBodyTextMutation, SetWaListBodyTextMutationVariables>;
export const SetWaListButtonTitleDocument = new TypedDocumentString(`
mutation SetWAListButtonTitle($elementID: BlockElementID!, $text: String!) {
  whatsAppListSetButtonTitle(blockElementID: $elementID, text: $text) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWaListButtonTitleMutation, SetWaListButtonTitleMutationVariables>;
export const SetWaListRowDescriptionDocument = new TypedDocumentString(`
mutation SetWAListRowDescription($elementID: BlockElementID!, $rowID: ComponentHandleID!, $description: String!) {
  whatsAppListSetRowDescription(
    blockElementID: $elementID
    rowID: $rowID
    description: $description
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWaListRowDescriptionMutation, SetWaListRowDescriptionMutationVariables>;
export const DeleteWaListRowDocument = new TypedDocumentString(`
mutation DeleteWAListRow($elementID: BlockElementID!, $rowID: ComponentHandleID!) {
  whatsAppListDeleteRow(blockElementID: $elementID, rowID: $rowID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteWaListRowMutation, DeleteWaListRowMutationVariables>;
export const SetWaListWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWAListWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppListWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWaListWaitForRepliesMutation, SetWaListWaitForRepliesMutationVariables>;
export const SetWaListSaveReplyDocument = new TypedDocumentString(`
mutation SetWAListSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppListSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWaListSaveReplyMutation, SetWaListSaveReplyMutationVariables>;
export const WhatsAppTemplatesCatalogDocument = new TypedDocumentString(`
query WhatsAppTemplatesCatalog($botID: BotID!, $first: Int) {
  bot(id: $botID) {
    id
    whatsAppTemplates(first: $first) {
      edges {
        node {
          id
          name
          status
          language
          category
          IsSupportedInFlowbuilder
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`) as unknown as TypedDocumentString<WhatsAppTemplatesCatalogQuery, WhatsAppTemplatesCatalogQueryVariables>;
export const SetWhatsAppTemplateDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplate($elementID: BlockElementID!, $templateID: WhatsAppTemplateID!) {
  whatsAppTemplateSetTemplate(blockElementID: $elementID, templateID: $templateID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateMutation, SetWhatsAppTemplateMutationVariables>;
export const DeleteWhatsAppTemplateDocument = new TypedDocumentString(`
mutation DeleteWhatsAppTemplate($elementID: BlockElementID!) {
  whatsAppTemplateDeleteTemplate(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteWhatsAppTemplateMutation, DeleteWhatsAppTemplateMutationVariables>;
export const SetWhatsAppTemplateBodyTextParamDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateBodyTextParam($elementID: BlockElementID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetBodyTextParamValue(
    blockElementID: $elementID
    name: $name
    value: $value
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateBodyTextParamMutation, SetWhatsAppTemplateBodyTextParamMutationVariables>;
export const SetWhatsAppTemplateHeaderTextParamDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateHeaderTextParam($elementID: BlockElementID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetHeaderTextParamValue(
    blockElementID: $elementID
    name: $name
    value: $value
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateHeaderTextParamMutation, SetWhatsAppTemplateHeaderTextParamMutationVariables>;
export const SetWhatsAppTemplateFooterTextParamDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateFooterTextParam($elementID: BlockElementID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetFooterTextParamValue(
    blockElementID: $elementID
    name: $name
    value: $value
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateFooterTextParamMutation, SetWhatsAppTemplateFooterTextParamMutationVariables>;
export const SetWhatsAppTemplateHeaderImageFileDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateHeaderImageFile($elementID: BlockElementID!, $fileID: FileID!) {
  whatsAppTemplateSetHeaderImageFile(blockElementID: $elementID, fileID: $fileID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateHeaderImageFileMutation, SetWhatsAppTemplateHeaderImageFileMutationVariables>;
export const SetWhatsAppTemplateHeaderVideoFileDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateHeaderVideoFile($elementID: BlockElementID!, $fileID: FileID!) {
  whatsAppTemplateSetHeaderVideoFile(blockElementID: $elementID, fileID: $fileID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateHeaderVideoFileMutation, SetWhatsAppTemplateHeaderVideoFileMutationVariables>;
export const SetWhatsAppTemplateHeaderDocumentFileDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateHeaderDocumentFile($elementID: BlockElementID!, $fileID: FileID!, $fileName: String!) {
  whatsAppTemplateSetHeaderDocumentFile(
    blockElementID: $elementID
    fileID: $fileID
    fileName: $fileName
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateHeaderDocumentFileMutation, SetWhatsAppTemplateHeaderDocumentFileMutationVariables>;
export const SetWhatsAppTemplateUrlButtonTextParamDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateURLButtonTextParam($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetURLButtonTextParamValue(
    blockElementID: $elementID
    buttonID: $buttonID
    name: $name
    value: $value
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateUrlButtonTextParamMutation, SetWhatsAppTemplateUrlButtonTextParamMutationVariables>;
export const SetWhatsAppTemplateCopyCodeButtonCodeDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateCopyCodeButtonCode($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $codeValue: String!) {
  whatsAppTemplateSetCopyCodeButtonCodeValue(
    blockElementID: $elementID
    buttonID: $buttonID
    codeValue: $codeValue
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateCopyCodeButtonCodeMutation, SetWhatsAppTemplateCopyCodeButtonCodeMutationVariables>;
export const SetWhatsAppTemplateWaitForRepliesDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateWaitForReplies($elementID: BlockElementID!, $waitForReplies: Boolean!) {
  whatsAppTemplateSetWaitForReplies(
    blockElementID: $elementID
    waitForReplies: $waitForReplies
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateWaitForRepliesMutation, SetWhatsAppTemplateWaitForRepliesMutationVariables>;
export const SetWhatsAppTemplateSaveReplyDocument = new TypedDocumentString(`
mutation SetWhatsAppTemplateSaveReply($elementID: BlockElementID!, $save: Boolean!, $attribute: AttributeName) {
  whatsAppTemplateSetSaveContactReplyToAttribute(
    blockElementID: $elementID
    saveContactReply: $save
    attribute: $attribute
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetWhatsAppTemplateSaveReplyMutation, SetWhatsAppTemplateSaveReplyMutationVariables>;
export const SetClearContactPropertyAttributeDocument = new TypedDocumentString(`
mutation SetClearContactPropertyAttribute($elementID: BlockElementID!, $name: AttributeName!) {
  clearContactPropertySetAttribute(blockElementID: $elementID, name: $name) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetClearContactPropertyAttributeMutation, SetClearContactPropertyAttributeMutationVariables>;
export const SetSendJsonHeaderTitleDocument = new TypedDocumentString(`
mutation SetSendJsonHeaderTitle($elementID: BlockElementID!, $headerID: SendJsonHeaderID!, $title: String!) {
  sendJsonUpdateHeaderTitle(
    blockElementID: $elementID
    headerID: $headerID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonHeaderTitleMutation, SetSendJsonHeaderTitleMutationVariables>;
export const SetSendJsonHeaderValueDocument = new TypedDocumentString(`
mutation SetSendJsonHeaderValue($elementID: BlockElementID!, $headerID: SendJsonHeaderID!, $value: String!) {
  sendJsonUpdateHeaderValue(
    blockElementID: $elementID
    headerID: $headerID
    value: $value
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonHeaderValueMutation, SetSendJsonHeaderValueMutationVariables>;
export const DeleteSendJsonHeaderDocument = new TypedDocumentString(`
mutation DeleteSendJsonHeader($elementID: BlockElementID!, $headerID: SendJsonHeaderID!) {
  sendJsonDeleteHeader(blockElementID: $elementID, headerID: $headerID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteSendJsonHeaderMutation, DeleteSendJsonHeaderMutationVariables>;
export const SetSendJsonPayloadTypeDocument = new TypedDocumentString(`
mutation SetSendJsonPayloadType($elementID: BlockElementID!, $payloadType: SendJsonPayloadType!) {
  sendJsonUpdatePayloadType(blockElementID: $elementID, payloadType: $payloadType) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonPayloadTypeMutation, SetSendJsonPayloadTypeMutationVariables>;
export const SetSendJsonCustomPayloadDocument = new TypedDocumentString(`
mutation SetSendJsonCustomPayload($elementID: BlockElementID!, $payload: String!) {
  sendJsonUpdateCustomRequestPayload(
    blockElementID: $elementID
    payload: $payload
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonCustomPayloadMutation, SetSendJsonCustomPayloadMutationVariables>;
export const AddSendJsonUrlParamDocument = new TypedDocumentString(`
mutation AddSendJsonURLParam($elementID: BlockElementID!) {
  sendJsonAddURLParam(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSendJsonUrlParamMutation, AddSendJsonUrlParamMutationVariables>;
export const SetSendJsonUrlParamTitleDocument = new TypedDocumentString(`
mutation SetSendJsonURLParamTitle($elementID: BlockElementID!, $paramID: SendJsonURLParamID!, $title: String!) {
  sendJsonUpdateURLParamTitle(
    blockElementID: $elementID
    paramID: $paramID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonUrlParamTitleMutation, SetSendJsonUrlParamTitleMutationVariables>;
export const SetSendJsonUrlParamValueDocument = new TypedDocumentString(`
mutation SetSendJsonURLParamValue($elementID: BlockElementID!, $paramID: SendJsonURLParamID!, $value: String!) {
  sendJsonUpdateURLParamValue(
    blockElementID: $elementID
    paramID: $paramID
    value: $value
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonUrlParamValueMutation, SetSendJsonUrlParamValueMutationVariables>;
export const DeleteSendJsonUrlParamDocument = new TypedDocumentString(`
mutation DeleteSendJsonURLParam($elementID: BlockElementID!, $paramID: SendJsonURLParamID!) {
  sendJsonDeleteURLParam(blockElementID: $elementID, paramID: $paramID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteSendJsonUrlParamMutation, DeleteSendJsonUrlParamMutationVariables>;
export const AddSendJsonParsingRuleDocument = new TypedDocumentString(`
mutation AddSendJsonParsingRule($elementID: BlockElementID!) {
  sendJsonResponseAddParsingRule(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSendJsonParsingRuleMutation, AddSendJsonParsingRuleMutationVariables>;
export const SetSendJsonParsingRuleAttributeDocument = new TypedDocumentString(`
mutation SetSendJsonParsingRuleAttribute($elementID: BlockElementID!, $ruleID: SendJsonResponseParsingRuleID!, $name: AttributeName!) {
  sendJsonUpdateResponseParsingRuleAttributeName(
    blockElementID: $elementID
    ruleID: $ruleID
    name: $name
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonParsingRuleAttributeMutation, SetSendJsonParsingRuleAttributeMutationVariables>;
export const SetSendJsonParsingRuleJsonPathDocument = new TypedDocumentString(`
mutation SetSendJsonParsingRuleJSONPath($elementID: BlockElementID!, $ruleID: SendJsonResponseParsingRuleID!, $path: String!) {
  sendJsonUpdateResponseParsingRuleJSONPath(
    blockElementID: $elementID
    ruleID: $ruleID
    path: $path
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSendJsonParsingRuleJsonPathMutation, SetSendJsonParsingRuleJsonPathMutationVariables>;
export const DeleteSendJsonParsingRuleDocument = new TypedDocumentString(`
mutation DeleteSendJsonParsingRule($elementID: BlockElementID!, $ruleID: SendJsonResponseParsingRuleID!) {
  sendJsonDeleteResponseParsingRule(blockElementID: $elementID, ruleID: $ruleID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteSendJsonParsingRuleMutation, DeleteSendJsonParsingRuleMutationVariables>;
export const EnableSendJsonParsingRulesDocument = new TypedDocumentString(`
mutation EnableSendJsonParsingRules($elementID: BlockElementID!) {
  sendJsonEnableResponseParsingRules(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<EnableSendJsonParsingRulesMutation, EnableSendJsonParsingRulesMutationVariables>;
export const DisableSendJsonParsingRulesDocument = new TypedDocumentString(`
mutation DisableSendJsonParsingRules($elementID: BlockElementID!) {
  sendJsonDisableResponseParsingRules(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DisableSendJsonParsingRulesMutation, DisableSendJsonParsingRulesMutationVariables>;
export const AddSummarizeChatEntryDocument = new TypedDocumentString(`
mutation AddSummarizeChatEntry($elementID: BlockElementID!, $name: AttributeName!, $description: String!, $addAsFirst: Boolean!) {
  summarizeChatAddEntry(
    blockElementID: $elementID
    name: $name
    description: $description
    addAsFirst: $addAsFirst
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddSummarizeChatEntryMutation, AddSummarizeChatEntryMutationVariables>;
export const SetSummarizeChatEntryDocument = new TypedDocumentString(`
mutation SetSummarizeChatEntry($elementID: BlockElementID!, $id: String!, $name: AttributeName!, $description: String!) {
  summarizeChatUpdateEntry(
    blockElementID: $elementID
    id: $id
    name: $name
    description: $description
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetSummarizeChatEntryMutation, SetSummarizeChatEntryMutationVariables>;
export const DeleteSummarizeChatEntryDocument = new TypedDocumentString(`
mutation DeleteSummarizeChatEntry($elementID: BlockElementID!, $id: String!) {
  summarizeChatDeleteEntry(blockElementID: $elementID, id: $id) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteSummarizeChatEntryMutation, DeleteSummarizeChatEntryMutationVariables>;
export const RemoveRedirectTargetFlowDocument = new TypedDocumentString(`
mutation RemoveRedirectTargetFlow($elementID: BlockElementID!) {
  redirectToFlowRemoveTargetFlow(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<RemoveRedirectTargetFlowMutation, RemoveRedirectTargetFlowMutationVariables>;
export const SetDefaultReplyFrequencyDocument = new TypedDocumentString(`
mutation SetDefaultReplyFrequency($elementID: BlockElementID!, $frequency: DefaultReplyFrequency!) {
  defaultReplySetFrequency(blockElementID: $elementID, frequency: $frequency) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetDefaultReplyFrequencyMutation, SetDefaultReplyFrequencyMutationVariables>;
export const SetTriggeredMessageSegmentDocument = new TypedDocumentString(`
mutation SetTriggeredMessageSegment($elementID: BlockElementID!, $request: SegmentInput!) {
  triggeredMessageSetSegment(blockElementID: $elementID, request: $request) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetTriggeredMessageSegmentMutation, SetTriggeredMessageSegmentMutationVariables>;
export const SetTriggerConditionTypeDocument = new TypedDocumentString(`
mutation SetTriggerConditionType($triggerID: TriggerID!, $conditionType: TriggerConditionType!) {
  triggerSetConditionType(id: $triggerID, conditionType: $conditionType) {
    ...TriggerParts
  }
}
${AttrNameFragmentDoc}
${TriggerPartsFragmentDoc}`) as unknown as TypedDocumentString<SetTriggerConditionTypeMutation, SetTriggerConditionTypeMutationVariables>;
export const SetTriggerDelayDocument = new TypedDocumentString(`
mutation SetTriggerDelay($triggerID: TriggerID!, $delay: TriggerDelayInput!) {
  triggerSetDelay(id: $triggerID, delay: $delay) {
    ...TriggerParts
  }
}
${AttrNameFragmentDoc}
${TriggerPartsFragmentDoc}`) as unknown as TypedDocumentString<SetTriggerDelayMutation, SetTriggerDelayMutationVariables>;
export const SetTriggerAttributeFilterDocument = new TypedDocumentString(`
mutation SetTriggerAttributeFilter($triggerID: TriggerID!, $attrCondition: AttrFilterInput!) {
  triggerSetAttributeFilter(id: $triggerID, attrCondition: $attrCondition) {
    ...TriggerParts
  }
}
${AttrNameFragmentDoc}
${TriggerPartsFragmentDoc}`) as unknown as TypedDocumentString<SetTriggerAttributeFilterMutation, SetTriggerAttributeFilterMutationVariables>;
export const DeleteTriggerAttributeFilterDocument = new TypedDocumentString(`
mutation DeleteTriggerAttributeFilter($triggerID: TriggerID!) {
  triggerDeleteAttributeFilter(id: $triggerID) {
    ...TriggerParts
  }
}
${AttrNameFragmentDoc}
${TriggerPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteTriggerAttributeFilterMutation, DeleteTriggerAttributeFilterMutationVariables>;
export const SetOneTimeNotificationSegmentDocument = new TypedDocumentString(`
mutation SetOneTimeNotificationSegment($elementID: BlockElementID!, $request: SegmentInput!) {
  whatsAppOneTimeNotificationUpdateSegment(
    blockElementID: $elementID
    request: $request
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetOneTimeNotificationSegmentMutation, SetOneTimeNotificationSegmentMutationVariables>;
export const SendOneTimeNotificationDocument = new TypedDocumentString(`
mutation SendOneTimeNotification($elementID: BlockElementID!) {
  whatsAppOneTimeNotificationSend(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SendOneTimeNotificationMutation, SendOneTimeNotificationMutationVariables>;
export const SetScheduledMessageSegmentDocument = new TypedDocumentString(`
mutation SetScheduledMessageSegment($elementID: BlockElementID!, $request: SegmentInput!) {
  whatsAppScheduledMessageUpdateSegment(
    blockElementID: $elementID
    request: $request
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetScheduledMessageSegmentMutation, SetScheduledMessageSegmentMutationVariables>;
export const SetScheduledMessageRepeatTypeDocument = new TypedDocumentString(`
mutation SetScheduledMessageRepeatType($elementID: BlockElementID!, $repeatType: BroadcastRepeatType!) {
  whatsAppScheduledMessageSetRepeatType(
    blockElementID: $elementID
    repeatType: $repeatType
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetScheduledMessageRepeatTypeMutation, SetScheduledMessageRepeatTypeMutationVariables>;
export const SetScheduledMessageWeekdaysDocument = new TypedDocumentString(`
mutation SetScheduledMessageWeekdays($elementID: BlockElementID!, $weekdays: [Weekday!]) {
  whatsAppScheduledMessageSetWeekdays(
    blockElementID: $elementID
    weekdays: $weekdays
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetScheduledMessageWeekdaysMutation, SetScheduledMessageWeekdaysMutationVariables>;
export const SetScheduledMessageRepeatEveryNDaysDocument = new TypedDocumentString(`
mutation SetScheduledMessageRepeatEveryNDays($elementID: BlockElementID!, $everyNDays: Int!) {
  whatsAppScheduledMessageSetRepeatEveryNDays(
    blockElementID: $elementID
    everyNDays: $everyNDays
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetScheduledMessageRepeatEveryNDaysMutation, SetScheduledMessageRepeatEveryNDaysMutationVariables>;
export const SetScheduledMessageOnCertainDatesDocument = new TypedDocumentString(`
mutation SetScheduledMessageOnCertainDates($elementID: BlockElementID!, $certainDates: [Time!]!) {
  whatsAppScheduledMessageSetOnCertainDates(
    blockElementID: $elementID
    certainDates: $certainDates
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetScheduledMessageOnCertainDatesMutation, SetScheduledMessageOnCertainDatesMutationVariables>;
export const SetScheduledMessageFirstSendTimeDocument = new TypedDocumentString(`
mutation SetScheduledMessageFirstSendTime($elementID: BlockElementID!, $firstSendTime: Time!, $correctedWeekdays: [Weekday!]!) {
  whatsAppScheduledMessageSetFirstSendTime(
    blockElementID: $elementID
    firstSendTime: $firstSendTime
    correctedWeekdays: $correctedWeekdays
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetScheduledMessageFirstSendTimeMutation, SetScheduledMessageFirstSendTimeMutationVariables>;
export const SetAiAgentKnowledgeItemPromptDocument = new TypedDocumentString(`
mutation SetAiAgentKnowledgeItemPrompt($elementID: BlockElementID!, $knowledgeItemID: AiAgentKnowledgeItemID!, $prompt: String!) {
  aiAgentUpdateKnowledgeItemPrompt(
    blockElementID: $elementID
    knowledgeItemID: $knowledgeItemID
    prompt: $prompt
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentKnowledgeItemPromptMutation, SetAiAgentKnowledgeItemPromptMutationVariables>;
export const ClearAiAgentKnowledgeItemPromptsDocument = new TypedDocumentString(`
mutation ClearAiAgentKnowledgeItemPrompts($elementID: BlockElementID!) {
  aiAgentClearAllKnowledgeItemPrompts(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<ClearAiAgentKnowledgeItemPromptsMutation, ClearAiAgentKnowledgeItemPromptsMutationVariables>;
export const AddAiAgentCustomRuleDocument = new TypedDocumentString(`
mutation AddAiAgentCustomRule($elementID: BlockElementID!) {
  aiAgentCustomCreateRule(blockElementID: $elementID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<AddAiAgentCustomRuleMutation, AddAiAgentCustomRuleMutationVariables>;
export const SetAiAgentCustomRuleTitleDocument = new TypedDocumentString(`
mutation SetAiAgentCustomRuleTitle($elementID: BlockElementID!, $ruleID: ComponentHandleID!, $title: String!) {
  aiAgentCustomUpdateRuleTitle(
    blockElementID: $elementID
    ruleID: $ruleID
    title: $title
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentCustomRuleTitleMutation, SetAiAgentCustomRuleTitleMutationVariables>;
export const SetAiAgentCustomRulePromptDocument = new TypedDocumentString(`
mutation SetAiAgentCustomRulePrompt($elementID: BlockElementID!, $ruleID: ComponentHandleID!, $prompt: String!) {
  aiAgentCustomUpdateRulePrompt(
    blockElementID: $elementID
    ruleID: $ruleID
    prompt: $prompt
  ) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<SetAiAgentCustomRulePromptMutation, SetAiAgentCustomRulePromptMutationVariables>;
export const DeleteAiAgentCustomRuleDocument = new TypedDocumentString(`
mutation DeleteAiAgentCustomRule($elementID: BlockElementID!, $ruleID: ComponentHandleID!) {
  aiAgentCustomDeleteRule(blockElementID: $elementID, ruleID: $ruleID) {
    ...BlockParts
  }
}
${AttrNameFragmentDoc}
${TStrFragmentDoc}
${FileRefFragmentDoc}
${ElementErrorsFragmentDoc}
${SegmentFilterPartsFragmentDoc}
${SegmentPartsFragmentDoc}
${TriggerPartsFragmentDoc}
${WidgetBtnFragmentDoc}
${WaBtnFragmentDoc}
${WaTplTextFragmentDoc}
${ElementPartsFragmentDoc}
${BlockPartsFragmentDoc}`) as unknown as TypedDocumentString<DeleteAiAgentCustomRuleMutation, DeleteAiAgentCustomRuleMutationVariables>;
export const FlowTestStartDocument = new TypedDocumentString(`
mutation FlowTestStart($flowID: FlowID!) {
  previewResponsesStartInFlow(flowID: $flowID) {
    ...FtSessionParts
  }
}
${FtSessionPartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestStartMutation, FlowTestStartMutationVariables>;
export const FlowTestSessionReadbackDocument = new TypedDocumentString(`
query FlowTestSessionReadback($botID: BotID!, $flowID: FlowID!) {
  bot(id: $botID) {
    id
    flow(flowID: $flowID) {
      id
      previewResponsesSession {
        ...FtSessionParts
      }
    }
  }
}
${FtSessionPartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestSessionReadbackQuery, FlowTestSessionReadbackQueryVariables>;
export const FlowTestMessagesDocument = new TypedDocumentString(`
query FlowTestMessages($botID: BotID!, $conversationID: ConversationID!, $first: Int, $after: MessagesCursor) {
  bot(id: $botID) {
    id
    conversation(conversationID: $conversationID) {
      __typename
      id
      platform
      messages(first: $first, after: $after) {
        edges {
          cursor
          node {
            ...FtMessageParts
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
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestMessagesQuery, FlowTestMessagesQueryVariables>;
export const FlowTestMessageAddedDocument = new TypedDocumentString(`
subscription FlowTestMessageAdded($botID: BotID!, $conversationID: ConversationID!) {
  messageAdded(botID: $botID, conversationID: $conversationID) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestMessageAddedSubscription, FlowTestMessageAddedSubscriptionVariables>;
export const FlowTestMessageUpdatedDocument = new TypedDocumentString(`
subscription FlowTestMessageUpdated($botID: BotID!, $conversationID: ConversationID!) {
  messageUpdated(botID: $botID, conversationID: $conversationID) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestMessageUpdatedSubscription, FlowTestMessageUpdatedSubscriptionVariables>;
export const FlowTestWidgetTextSendDocument = new TypedDocumentString(`
mutation FlowTestWidgetTextSend($botID: BotID!, $conversationID: ConversationID!, $message: WidgetTextMessageSendInput!) {
  previewResponsesWidgetTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWidgetTextSendMutation, FlowTestWidgetTextSendMutationVariables>;
export const FlowTestWhatsAppTextSendDocument = new TypedDocumentString(`
mutation FlowTestWhatsAppTextSend($botID: BotID!, $conversationID: ConversationID!, $message: WhatsAppTextMessageSendInput!) {
  previewResponsesWhatsappTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWhatsAppTextSendMutation, FlowTestWhatsAppTextSendMutationVariables>;
export const FlowTestInstagramTextSendDocument = new TypedDocumentString(`
mutation FlowTestInstagramTextSend($botID: BotID!, $conversationID: ConversationID!, $message: InstagramTextMessageSendInput!) {
  previewResponsesInstagramTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestInstagramTextSendMutation, FlowTestInstagramTextSendMutationVariables>;
export const FlowTestTikTokTextSendDocument = new TypedDocumentString(`
mutation FlowTestTikTokTextSend($botID: BotID!, $conversationID: ConversationID!, $message: TikTokTextMessageSendInput!) {
  previewResponsesTikTokTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestTikTokTextSendMutation, FlowTestTikTokTextSendMutationVariables>;
export const FlowTestFacebookTextSendDocument = new TypedDocumentString(`
mutation FlowTestFacebookTextSend($botID: BotID!, $conversationID: ConversationID!, $message: FacebookTextMessageSendInput!) {
  previewResponsesFacebookTextSend(
    botID: $botID
    conversationID: $conversationID
    message: $message
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestFacebookTextSendMutation, FlowTestFacebookTextSendMutationVariables>;
export const FlowTestWidgetContinueFlowClickDocument = new TypedDocumentString(`
mutation FlowTestWidgetContinueFlowClick($botID: BotID!, $conversationID: ConversationID!, $click: PreviewResponsesBtnClickInput!) {
  previewResponsesWidgetContinueFlowBtnClickSend(
    botID: $botID
    conversationID: $conversationID
    click: $click
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWidgetContinueFlowClickMutation, FlowTestWidgetContinueFlowClickMutationVariables>;
export const FlowTestWidgetOpenUrlClickDocument = new TypedDocumentString(`
mutation FlowTestWidgetOpenURLClick($botID: BotID!, $conversationID: ConversationID!, $click: PreviewResponsesBtnClickInput!) {
  previewResponsesWidgetOpenURLBtnClickSend(
    botID: $botID
    conversationID: $conversationID
    click: $click
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWidgetOpenUrlClickMutation, FlowTestWidgetOpenUrlClickMutationVariables>;
export const FlowTestWidgetCallPhoneClickDocument = new TypedDocumentString(`
mutation FlowTestWidgetCallPhoneClick($botID: BotID!, $conversationID: ConversationID!, $click: PreviewResponsesBtnClickInput!) {
  previewResponsesWidgetCallPhoneBtnClickSend(
    botID: $botID
    conversationID: $conversationID
    click: $click
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWidgetCallPhoneClickMutation, FlowTestWidgetCallPhoneClickMutationVariables>;
export const FlowTestWhatsAppContinueFlowClickDocument = new TypedDocumentString(`
mutation FlowTestWhatsAppContinueFlowClick($botID: BotID!, $conversationID: ConversationID!, $click: PreviewResponsesBtnClickInput!) {
  previewResponsesWhatsappContinueFlowBtnClickSend(
    botID: $botID
    conversationID: $conversationID
    click: $click
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWhatsAppContinueFlowClickMutation, FlowTestWhatsAppContinueFlowClickMutationVariables>;
export const FlowTestWhatsAppTemplateQuickReplyClickDocument = new TypedDocumentString(`
mutation FlowTestWhatsAppTemplateQuickReplyClick($botID: BotID!, $conversationID: ConversationID!, $click: PreviewResponsesBtnClickInput!) {
  previewResponsesWhatsappTemplateQuickReplyBtnClickSend(
    botID: $botID
    conversationID: $conversationID
    click: $click
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWhatsAppTemplateQuickReplyClickMutation, FlowTestWhatsAppTemplateQuickReplyClickMutationVariables>;
export const FlowTestWhatsAppListRowClickDocument = new TypedDocumentString(`
mutation FlowTestWhatsAppListRowClick($botID: BotID!, $conversationID: ConversationID!, $click: PreviewResponsesWAListRowClickInput!) {
  previewResponsesWhatsappListRowClickSend(
    botID: $botID
    conversationID: $conversationID
    click: $click
  ) {
    ...FtMessageParts
  }
}
${FtFileFragmentDoc}
${FtMessageCommonFragmentDoc}
${FtWhatsAppPartsFragmentDoc}
${FtWidgetPartsFragmentDoc}
${FtOtherPlatformPartsFragmentDoc}
${FtSystemPartsFragmentDoc}
${FtMessagePartsFragmentDoc}`) as unknown as TypedDocumentString<FlowTestWhatsAppListRowClickMutation, FlowTestWhatsAppListRowClickMutationVariables>;