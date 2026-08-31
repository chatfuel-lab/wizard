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

export type KbFileInfoFragment = { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null };

export type GoodsProductInfoFragment = { __typename?: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> };

export type GoodsServiceInfoFragment = { __typename?: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> };

export type KbSpecialistDayFragment = { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null };

export type SpecialistInfoFragment = { __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }> };

export type KnowledgeBaseQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type KnowledgeBaseQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', companyName: string, email: string, phone: string, address: string, website: string, howToPay: string, additionalInstructions: string, businessHoursSchedule: { __typename?: 'FuelyBusinessHoursSchedule', workingHours?: Array<{ __typename?: 'FuelyBusinessHoursDaySchedule', day: Weekday, enabled: boolean, start: string, end: string }> | null }, faqs: Array<{ __typename?: 'FuelyKnowledgeBaseFAQ', question: string, answer: string }> }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type GoodsCatalogQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type GoodsCatalogQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }> } };

export type SpecialistsQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type SpecialistsQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }> }> } };

type KbGapContact_FacebookContact_Fragment = { __typename: 'FacebookContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null };

type KbGapContact_InstagramContact_Fragment = { __typename: 'InstagramContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null };

type KbGapContact_TikTokContact_Fragment = { __typename: 'TikTokContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null };

type KbGapContact_UnavailableContact_Fragment = { __typename: 'UnavailableContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null };

type KbGapContact_WhatsappContact_Fragment = { __typename: 'WhatsappContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null };

type KbGapContact_WidgetContact_Fragment = { __typename: 'WidgetContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null };

export type KbGapContactFragment = KbGapContact_FacebookContact_Fragment | KbGapContact_InstagramContact_Fragment | KbGapContact_TikTokContact_Fragment | KbGapContact_UnavailableContact_Fragment | KbGapContact_WhatsappContact_Fragment | KbGapContact_WidgetContact_Fragment;

type KbGapMessage_FacebookInAudioMessage_Fragment = { __typename: 'FacebookInAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookInFileMessage_Fragment = { __typename: 'FacebookInFileMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookInImageMessage_Fragment = { __typename: 'FacebookInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookInPostCommentMessage_Fragment = { __typename: 'FacebookInPostCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookInTextMessage_Fragment = { __typename: 'FacebookInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookInUnknownMessage_Fragment = { __typename: 'FacebookInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookInVideoMessage_Fragment = { __typename: 'FacebookInVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookOutAudioMessage_Fragment = { __typename: 'FacebookOutAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookOutImageMessage_Fragment = { __typename: 'FacebookOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookOutPublicCommentReplyMessage_Fragment = { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookOutTextMessage_Fragment = { __typename: 'FacebookOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookOutUnknownMessage_Fragment = { __typename: 'FacebookOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_FacebookOutVideoMessage_Fragment = { __typename: 'FacebookOutVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInAdCommentMessage_Fragment = { __typename: 'InstagramInAdCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInAudioMessage_Fragment = { __typename: 'InstagramInAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInFeedCommentMessage_Fragment = { __typename: 'InstagramInFeedCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInImageMessage_Fragment = { __typename: 'InstagramInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInReelCommentMessage_Fragment = { __typename: 'InstagramInReelCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInStoryReplyMessage_Fragment = { __typename: 'InstagramInStoryReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInTextMessage_Fragment = { __typename: 'InstagramInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInUnknownMessage_Fragment = { __typename: 'InstagramInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramInVideoMessage_Fragment = { __typename: 'InstagramInVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramOutAudioMessage_Fragment = { __typename: 'InstagramOutAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramOutImageMessage_Fragment = { __typename: 'InstagramOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramOutPublicCommentReplyMessage_Fragment = { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramOutTextMessage_Fragment = { __typename: 'InstagramOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramOutUnknownMessage_Fragment = { __typename: 'InstagramOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_InstagramOutVideoMessage_Fragment = { __typename: 'InstagramOutVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemConversationSummaryMessage_Fragment = { __typename: 'SystemConversationSummaryMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatClosedByAutoClosingMessage_Fragment = { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedByBooking_Fragment = { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedByCoexMessage_Fragment = { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedByComponentMessage_Fragment = { __typename: 'SystemLivechatOpenedByComponentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedByFacebookAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedByInstagramAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedByTikTokAppMessage_Fragment = { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemLivechatOpenedManuallyMessage_Fragment = { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemMetaConversionEventSentMessage_Fragment = { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_SystemTypingMessage_Fragment = { __typename: 'SystemTypingMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokInImageMessage_Fragment = { __typename: 'TikTokInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokInTextMessage_Fragment = { __typename: 'TikTokInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokInTextPostCommentMessage_Fragment = { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokInUnknownMessage_Fragment = { __typename: 'TikTokInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokOutImageMessage_Fragment = { __typename: 'TikTokOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokOutPublicCommentReplyMessage_Fragment = { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokOutTextMessage_Fragment = { __typename: 'TikTokOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_TikTokOutUnknownMessage_Fragment = { __typename: 'TikTokOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WebWidgetAttachmentMessage_Fragment = { __typename: 'WebWidgetAttachmentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WebWidgetCallPhoneButtonClickMessage_Fragment = { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WebWidgetContinueFlowButtonClickMessage_Fragment = { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WebWidgetOpenUrlButtonClickMessage_Fragment = { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WebWidgetTextAndButtonsMessage_Fragment = { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WebWidgetTextMessage_Fragment = { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInAudioMessage_Fragment = { __typename: 'WhatsAppInAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInContinueFlowButtonClickMessage_Fragment = { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInDocumentMessage_Fragment = { __typename: 'WhatsAppInDocumentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInImageMessage_Fragment = { __typename: 'WhatsAppInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInListRowClickMessage_Fragment = { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInMediaPlaceholderMessage_Fragment = { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment = { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInTextMessage_Fragment = { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInUnknownMessage_Fragment = { __typename: 'WhatsAppInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppInVideoMessage_Fragment = { __typename: 'WhatsAppInVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutAudioMessage_Fragment = { __typename: 'WhatsAppOutAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutDocumentMessage_Fragment = { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutImageMessage_Fragment = { __typename: 'WhatsAppOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutListMessage_Fragment = { __typename: 'WhatsAppOutListMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutMediaPlaceholderMessage_Fragment = { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutTemplateMessage_Fragment = { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutTextAndButtonsMessage_Fragment = { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutTextAndUrlMessage_Fragment = { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutTextMessage_Fragment = { __typename: 'WhatsAppOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutUnknownMessage_Fragment = { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

type KbGapMessage_WhatsAppOutVideoMessage_Fragment = { __typename: 'WhatsAppOutVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } };

export type KbGapMessageFragment = KbGapMessage_FacebookInAudioMessage_Fragment | KbGapMessage_FacebookInFileMessage_Fragment | KbGapMessage_FacebookInImageMessage_Fragment | KbGapMessage_FacebookInPostCommentMessage_Fragment | KbGapMessage_FacebookInTextMessage_Fragment | KbGapMessage_FacebookInUnknownMessage_Fragment | KbGapMessage_FacebookInVideoMessage_Fragment | KbGapMessage_FacebookOutAudioMessage_Fragment | KbGapMessage_FacebookOutImageMessage_Fragment | KbGapMessage_FacebookOutPublicCommentReplyMessage_Fragment | KbGapMessage_FacebookOutTextMessage_Fragment | KbGapMessage_FacebookOutUnknownMessage_Fragment | KbGapMessage_FacebookOutVideoMessage_Fragment | KbGapMessage_InstagramInAdCommentMessage_Fragment | KbGapMessage_InstagramInAudioMessage_Fragment | KbGapMessage_InstagramInFeedCommentMessage_Fragment | KbGapMessage_InstagramInImageMessage_Fragment | KbGapMessage_InstagramInReelCommentMessage_Fragment | KbGapMessage_InstagramInStoryReplyMessage_Fragment | KbGapMessage_InstagramInTextMessage_Fragment | KbGapMessage_InstagramInUnknownMessage_Fragment | KbGapMessage_InstagramInVideoMessage_Fragment | KbGapMessage_InstagramOutAudioMessage_Fragment | KbGapMessage_InstagramOutImageMessage_Fragment | KbGapMessage_InstagramOutPublicCommentReplyMessage_Fragment | KbGapMessage_InstagramOutTextMessage_Fragment | KbGapMessage_InstagramOutUnknownMessage_Fragment | KbGapMessage_InstagramOutVideoMessage_Fragment | KbGapMessage_SystemConversationSummaryMessage_Fragment | KbGapMessage_SystemLivechatClosedByAutoClosingMessage_Fragment | KbGapMessage_SystemLivechatOpenedByBooking_Fragment | KbGapMessage_SystemLivechatOpenedByCoexMessage_Fragment | KbGapMessage_SystemLivechatOpenedByComponentMessage_Fragment | KbGapMessage_SystemLivechatOpenedByFacebookAppMessage_Fragment | KbGapMessage_SystemLivechatOpenedByInstagramAppMessage_Fragment | KbGapMessage_SystemLivechatOpenedByTikTokAppMessage_Fragment | KbGapMessage_SystemLivechatOpenedManuallyMessage_Fragment | KbGapMessage_SystemMetaConversionEventSentMessage_Fragment | KbGapMessage_SystemTypingMessage_Fragment | KbGapMessage_TikTokInImageMessage_Fragment | KbGapMessage_TikTokInTextMessage_Fragment | KbGapMessage_TikTokInTextPostCommentMessage_Fragment | KbGapMessage_TikTokInUnknownMessage_Fragment | KbGapMessage_TikTokOutImageMessage_Fragment | KbGapMessage_TikTokOutPublicCommentReplyMessage_Fragment | KbGapMessage_TikTokOutTextMessage_Fragment | KbGapMessage_TikTokOutUnknownMessage_Fragment | KbGapMessage_WebWidgetAttachmentMessage_Fragment | KbGapMessage_WebWidgetCallPhoneButtonClickMessage_Fragment | KbGapMessage_WebWidgetContinueFlowButtonClickMessage_Fragment | KbGapMessage_WebWidgetOpenUrlButtonClickMessage_Fragment | KbGapMessage_WebWidgetTextAndButtonsMessage_Fragment | KbGapMessage_WebWidgetTextMessage_Fragment | KbGapMessage_WhatsAppInAudioMessage_Fragment | KbGapMessage_WhatsAppInContinueFlowButtonClickMessage_Fragment | KbGapMessage_WhatsAppInDocumentMessage_Fragment | KbGapMessage_WhatsAppInImageMessage_Fragment | KbGapMessage_WhatsAppInListRowClickMessage_Fragment | KbGapMessage_WhatsAppInMediaPlaceholderMessage_Fragment | KbGapMessage_WhatsAppInTemplateQuickReplyButtonClickMessage_Fragment | KbGapMessage_WhatsAppInTextMessage_Fragment | KbGapMessage_WhatsAppInUnknownMessage_Fragment | KbGapMessage_WhatsAppInVideoMessage_Fragment | KbGapMessage_WhatsAppOutAudioMessage_Fragment | KbGapMessage_WhatsAppOutDocumentMessage_Fragment | KbGapMessage_WhatsAppOutImageMessage_Fragment | KbGapMessage_WhatsAppOutListMessage_Fragment | KbGapMessage_WhatsAppOutMediaPlaceholderMessage_Fragment | KbGapMessage_WhatsAppOutTemplateMessage_Fragment | KbGapMessage_WhatsAppOutTextAndButtonsMessage_Fragment | KbGapMessage_WhatsAppOutTextAndUrlMessage_Fragment | KbGapMessage_WhatsAppOutTextMessage_Fragment | KbGapMessage_WhatsAppOutUnknownMessage_Fragment | KbGapMessage_WhatsAppOutVideoMessage_Fragment;

export type KbGapChatsQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['ContactSearchCursor']['input']>;
  assigneeFilter: ContactAssigneeFilter;
}>;


export type KbGapChatsQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, contactChatsConnection: { __typename?: 'ContactConnection', edges: Array<{ __typename?: 'ContactEdge', cursor: string, node: { __typename: 'FacebookContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null } | { __typename: 'InstagramContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null } | { __typename: 'TikTokContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null } | { __typename: 'UnavailableContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null } | { __typename: 'WhatsappContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null } | { __typename: 'WidgetContact', id: string, name: string, updatedAt: string, lastConversationMessageTime?: string | null, unhandledSwitchToHuman: boolean, assignee?: { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount' } | null, conversation?: { __typename: 'Conversation', id: string, platform: Platform, status: ConversationStatus, updatedAt: string } | null } }>, pageInfo: { __typename?: 'ContactPageInfo', hasNextPage: boolean, endCursor?: string | null } } } };

export type KbGapConversationQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  conversationID: Scalars['ConversationID']['input'];
  first: Scalars['Int']['input'];
}>;


export type KbGapConversationQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, conversation: { __typename: 'Conversation', id: string, platform: Platform, messages: { __typename?: 'MessagePage', edges: Array<{ __typename?: 'MessageEdge', node: { __typename: 'FacebookInAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookInFileMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookInPostCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookInVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookOutAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookOutPublicCommentReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'FacebookOutVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInAdCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInFeedCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInReelCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInStoryReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramInVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramOutAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramOutPublicCommentReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'InstagramOutVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemConversationSummaryMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatClosedByAutoClosingMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedByBooking', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedByCoexMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedByComponentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedByFacebookAppMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedByInstagramAppMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedByTikTokAppMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemLivechatOpenedManuallyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemMetaConversionEventSentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'SystemTypingMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokInTextPostCommentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokOutPublicCommentReplyMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'TikTokOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WebWidgetAttachmentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WebWidgetCallPhoneButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WebWidgetContinueFlowButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WebWidgetOpenURLButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WebWidgetTextAndButtonsMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WebWidgetTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInContinueFlowButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInDocumentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInListRowClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInMediaPlaceholderMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppInVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutAudioMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutDocumentMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutImageMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutListMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutMediaPlaceholderMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutTemplateMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutTextAndButtonsMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutTextAndURLMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutTextMessage', text: string, id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutUnknownMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } | { __typename: 'WhatsAppOutVideoMessage', id?: string | null, sentTime: string, sender: { __typename: 'AdminMessageSender' } | { __typename: 'AutomationMessageSender' } | { __typename: 'ContactMessageSender' } | { __typename: 'FacebookAppSender' } | { __typename: 'InstagramAppSender' } | { __typename: 'TikTokAppSender' } | { __typename: 'WhatsappBusinessAppSender' } } }> } } } };

export type KbSetCompanyNameMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  companyName: Scalars['String']['input'];
}>;


export type KbSetCompanyNameMutation = { __typename?: 'Mutation', fuelyConfigSetCompanyName: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', companyName: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetPhoneMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  phone: Scalars['String']['input'];
}>;


export type KbSetPhoneMutation = { __typename?: 'Mutation', fuelyConfigSetPhone: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', phone: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetEmailMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  email: Scalars['String']['input'];
}>;


export type KbSetEmailMutation = { __typename?: 'Mutation', fuelyConfigSetEmail: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', email: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetAddressMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  address: Scalars['String']['input'];
}>;


export type KbSetAddressMutation = { __typename?: 'Mutation', fuelyConfigSetAddress: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', address: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetWebsiteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  website: Scalars['String']['input'];
}>;


export type KbSetWebsiteMutation = { __typename?: 'Mutation', fuelyConfigSetWebsite: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', website: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetHowToPayMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  howToPay: Scalars['String']['input'];
}>;


export type KbSetHowToPayMutation = { __typename?: 'Mutation', fuelyConfigSetHowToPay: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', howToPay: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetAdditionalInstructionsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  additionalInstructions: Scalars['String']['input'];
}>;


export type KbSetAdditionalInstructionsMutation = { __typename?: 'Mutation', fuelyConfigSetAdditionalInstructions: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', additionalInstructions: string }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetBusinessHoursMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  schedule: FuelyBusinessHoursScheduleUpdateInput;
}>;


export type KbSetBusinessHoursMutation = { __typename?: 'Mutation', fuelyConfigSetBusinessHoursSchedule: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', businessHoursSchedule: { __typename?: 'FuelyBusinessHoursSchedule', workingHours?: Array<{ __typename?: 'FuelyBusinessHoursDaySchedule', day: Weekday, enabled: boolean, start: string, end: string }> | null } }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type KbSetFaQsMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  faqs: Array<FuelyKnowledgeBaseFaqInput> | FuelyKnowledgeBaseFaqInput;
}>;


export type KbSetFaQsMutation = { __typename?: 'Mutation', fuelyConfigSetFAQs: { __typename?: 'Bot', id: string, fuelyConfig?: { __typename?: 'FuelyConfig', knowledgeBase: { __typename?: 'FuelyKnowledgeBase', faqs: Array<{ __typename?: 'FuelyKnowledgeBaseFAQ', question: string, answer: string }> }, usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type GoodsProductCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  product: GoodsProductInput;
}>;


export type GoodsProductCreateMutation = { __typename?: 'Mutation', goodsProductCreate: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }>, fuelyConfig?: { __typename?: 'FuelyConfig', usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type GoodsProductUpdateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  itemID: Scalars['GoodsItemID']['input'];
  product: GoodsProductInput;
}>;


export type GoodsProductUpdateMutation = { __typename?: 'Mutation', goodsProductUpdate: { __typename?: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } };

export type GoodsProductDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  itemID: Scalars['GoodsItemID']['input'];
}>;


export type GoodsProductDeleteMutation = { __typename?: 'Mutation', goodsProductDelete: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }>, fuelyConfig?: { __typename?: 'FuelyConfig', usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type GoodsServiceCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  service: GoodsServiceInput;
}>;


export type GoodsServiceCreateMutation = { __typename?: 'Mutation', goodsServiceCreate: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }>, fuelyConfig?: { __typename?: 'FuelyConfig', usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type GoodsServiceUpdateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  itemID: Scalars['GoodsItemID']['input'];
  service: GoodsServiceInput;
}>;


export type GoodsServiceUpdateMutation = { __typename?: 'Mutation', goodsServiceUpdate: { __typename?: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } };

export type GoodsServiceDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  itemID: Scalars['GoodsItemID']['input'];
}>;


export type GoodsServiceDeleteMutation = { __typename?: 'Mutation', goodsServiceDelete: { __typename?: 'Bot', id: string, goodsCatalog: Array<{ __typename: 'DeletedGoodsService' } | { __typename: 'GoodsProduct', id: string, title: string, description: string, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> } | { __typename: 'GoodsService', id: string, title: string, description: string, durationSeconds: number, isAvailable: boolean, price?: { __typename?: 'GoodsItemPrice', amount: string, currency: GoodsItemPriceCurrency } | null, images: Array<{ __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null }> }>, fuelyConfig?: { __typename?: 'FuelyConfig', usage: { __typename?: 'FuelyConfigUsage', total: number, catalog: number } } | null } };

export type SpecialistCreateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  info: SpecialistInfoInput;
}>;


export type SpecialistCreateMutation = { __typename?: 'Mutation', specialistCreate: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }> }> } };

export type SpecialistUpdateMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
  info: SpecialistInfoInput;
}>;


export type SpecialistUpdateMutation = { __typename?: 'Mutation', specialistUpdate: { __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }> } };

export type SpecialistDeleteMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
  specialistID: Scalars['SpecialistID']['input'];
}>;


export type SpecialistDeleteMutation = { __typename?: 'Mutation', specialistDelete: { __typename?: 'Bot', id: string, specialists: Array<{ __typename?: 'Specialist', id: string, profile: { __typename?: 'SpecialistProfile', firstName: string, lastName?: string | null, aboutInfo?: string | null, logo?: { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null } | null }, schedule?: { __typename?: 'SpecialistSchedule', enabled: boolean, sun?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, mon?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, tue?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, wed?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, thu?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, fri?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null, sat?: { __typename?: 'SpecialistDaySchedule', enabled: boolean, start: string, end: string, break?: { __typename?: 'SpecialistDayScheduleBreak', start: string, end: string } | null } | null } | null, services: Array<{ __typename?: 'GoodsService', id: string }> }> } };

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
export const KbFileInfoFragmentDoc = new TypedDocumentString(`
fragment KBFileInfo on File {
  id
  url
  type
  status
  size
}`, {"fragmentName":"KBFileInfo"}) as unknown as TypedDocumentString<KbFileInfoFragment, unknown>;
export const GoodsProductInfoFragmentDoc = new TypedDocumentString(`
fragment GoodsProductInfo on GoodsProduct {
  id
  title
  description
  price {
    amount
    currency
  }
  isAvailable
  images {
    ...KBFileInfo
  }
}`, {"fragmentName":"GoodsProductInfo"}) as unknown as TypedDocumentString<GoodsProductInfoFragment, unknown>;
export const GoodsServiceInfoFragmentDoc = new TypedDocumentString(`
fragment GoodsServiceInfo on GoodsService {
  id
  title
  description
  durationSeconds
  price {
    amount
    currency
  }
  isAvailable
  images {
    ...KBFileInfo
  }
}`, {"fragmentName":"GoodsServiceInfo"}) as unknown as TypedDocumentString<GoodsServiceInfoFragment, unknown>;
export const KbSpecialistDayFragmentDoc = new TypedDocumentString(`
fragment KBSpecialistDay on SpecialistDaySchedule {
  enabled
  start
  end
  break {
    start
    end
  }
}`, {"fragmentName":"KBSpecialistDay"}) as unknown as TypedDocumentString<KbSpecialistDayFragment, unknown>;
export const SpecialistInfoFragmentDoc = new TypedDocumentString(`
fragment SpecialistInfo on Specialist {
  id
  profile {
    firstName
    lastName
    aboutInfo
    logo {
      ...KBFileInfo
    }
  }
  schedule {
    enabled
    sun {
      ...KBSpecialistDay
    }
    mon {
      ...KBSpecialistDay
    }
    tue {
      ...KBSpecialistDay
    }
    wed {
      ...KBSpecialistDay
    }
    thu {
      ...KBSpecialistDay
    }
    fri {
      ...KBSpecialistDay
    }
    sat {
      ...KBSpecialistDay
    }
  }
  services {
    id
  }
}`, {"fragmentName":"SpecialistInfo"}) as unknown as TypedDocumentString<SpecialistInfoFragment, unknown>;
export const KbGapContactFragmentDoc = new TypedDocumentString(`
fragment KBGapContact on Contact {
  __typename
  id
  name
  updatedAt
  lastConversationMessageTime
  unhandledSwitchToHuman
  assignee {
    __typename
  }
  conversation {
    __typename
    id
    platform
    status
    updatedAt
  }
}`, {"fragmentName":"KBGapContact"}) as unknown as TypedDocumentString<KbGapContactFragment, unknown>;
export const KbGapMessageFragmentDoc = new TypedDocumentString(`
fragment KBGapMessage on Message {
  __typename
  id
  sentTime
  sender {
    __typename
  }
  ... on WhatsAppInTextMessage {
    text
  }
  ... on InstagramInTextMessage {
    text
  }
  ... on FacebookInTextMessage {
    text
  }
  ... on TikTokInTextMessage {
    text
  }
  ... on WebWidgetTextMessage {
    text
  }
  ... on WhatsAppOutTextMessage {
    text
  }
  ... on InstagramOutTextMessage {
    text
  }
  ... on FacebookOutTextMessage {
    text
  }
  ... on TikTokOutTextMessage {
    text
  }
}`, {"fragmentName":"KBGapMessage"}) as unknown as TypedDocumentString<KbGapMessageFragment, unknown>;
export const KnowledgeBaseDocument = new TypedDocumentString(`
query KnowledgeBase($botID: BotID!) {
  bot(id: $botID) {
    id
    fuelyConfig {
      knowledgeBase {
        companyName
        email
        phone
        address
        website
        businessHoursSchedule {
          workingHours {
            day
            enabled
            start
            end
          }
        }
        howToPay
        additionalInstructions
        faqs {
          question
          answer
        }
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KnowledgeBaseQuery, KnowledgeBaseQueryVariables>;
export const GoodsCatalogDocument = new TypedDocumentString(`
query GoodsCatalog($botID: BotID!) {
  bot(id: $botID) {
    id
    goodsCatalog {
      __typename
      ...GoodsProductInfo
      ...GoodsServiceInfo
    }
  }
}
${KbFileInfoFragmentDoc}
${GoodsProductInfoFragmentDoc}
${GoodsServiceInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsCatalogQuery, GoodsCatalogQueryVariables>;
export const SpecialistsDocument = new TypedDocumentString(`
query Specialists($botID: BotID!) {
  bot(id: $botID) {
    id
    specialists {
      ...SpecialistInfo
    }
  }
}
${KbFileInfoFragmentDoc}
${KbSpecialistDayFragmentDoc}
${SpecialistInfoFragmentDoc}`) as unknown as TypedDocumentString<SpecialistsQuery, SpecialistsQueryVariables>;
export const KbGapChatsDocument = new TypedDocumentString(`
query KBGapChats($botID: BotID!, $first: Int!, $after: ContactSearchCursor, $assigneeFilter: ContactAssigneeFilter!) {
  bot(id: $botID) {
    id
    contactChatsConnection(
      first: $first
      after: $after
      assigneeFilter: $assigneeFilter
      unreadOnly: false
      salesStageV2Filter: []
    ) {
      edges {
        cursor
        node {
          ...KBGapContact
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
${KbGapContactFragmentDoc}`) as unknown as TypedDocumentString<KbGapChatsQuery, KbGapChatsQueryVariables>;
export const KbGapConversationDocument = new TypedDocumentString(`
query KBGapConversation($botID: BotID!, $conversationID: ConversationID!, $first: Int!) {
  bot(id: $botID) {
    id
    conversation(conversationID: $conversationID) {
      __typename
      id
      platform
      messages(first: $first) {
        edges {
          node {
            ...KBGapMessage
          }
        }
      }
    }
  }
}
${KbGapMessageFragmentDoc}`) as unknown as TypedDocumentString<KbGapConversationQuery, KbGapConversationQueryVariables>;
export const KbSetCompanyNameDocument = new TypedDocumentString(`
mutation KBSetCompanyName($botID: BotID!, $companyName: String!) {
  fuelyConfigSetCompanyName(botID: $botID, companyName: $companyName) {
    id
    fuelyConfig {
      knowledgeBase {
        companyName
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetCompanyNameMutation, KbSetCompanyNameMutationVariables>;
export const KbSetPhoneDocument = new TypedDocumentString(`
mutation KBSetPhone($botID: BotID!, $phone: String!) {
  fuelyConfigSetPhone(botID: $botID, phone: $phone) {
    id
    fuelyConfig {
      knowledgeBase {
        phone
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetPhoneMutation, KbSetPhoneMutationVariables>;
export const KbSetEmailDocument = new TypedDocumentString(`
mutation KBSetEmail($botID: BotID!, $email: String!) {
  fuelyConfigSetEmail(botID: $botID, email: $email) {
    id
    fuelyConfig {
      knowledgeBase {
        email
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetEmailMutation, KbSetEmailMutationVariables>;
export const KbSetAddressDocument = new TypedDocumentString(`
mutation KBSetAddress($botID: BotID!, $address: String!) {
  fuelyConfigSetAddress(botID: $botID, address: $address) {
    id
    fuelyConfig {
      knowledgeBase {
        address
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetAddressMutation, KbSetAddressMutationVariables>;
export const KbSetWebsiteDocument = new TypedDocumentString(`
mutation KBSetWebsite($botID: BotID!, $website: String!) {
  fuelyConfigSetWebsite(botID: $botID, website: $website) {
    id
    fuelyConfig {
      knowledgeBase {
        website
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetWebsiteMutation, KbSetWebsiteMutationVariables>;
export const KbSetHowToPayDocument = new TypedDocumentString(`
mutation KBSetHowToPay($botID: BotID!, $howToPay: String!) {
  fuelyConfigSetHowToPay(botID: $botID, howToPay: $howToPay) {
    id
    fuelyConfig {
      knowledgeBase {
        howToPay
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetHowToPayMutation, KbSetHowToPayMutationVariables>;
export const KbSetAdditionalInstructionsDocument = new TypedDocumentString(`
mutation KBSetAdditionalInstructions($botID: BotID!, $additionalInstructions: String!) {
  fuelyConfigSetAdditionalInstructions(
    botID: $botID
    additionalInstructions: $additionalInstructions
  ) {
    id
    fuelyConfig {
      knowledgeBase {
        additionalInstructions
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetAdditionalInstructionsMutation, KbSetAdditionalInstructionsMutationVariables>;
export const KbSetBusinessHoursDocument = new TypedDocumentString(`
mutation KBSetBusinessHours($botID: BotID!, $schedule: FuelyBusinessHoursScheduleUpdateInput!) {
  fuelyConfigSetBusinessHoursSchedule(botID: $botID, schedule: $schedule) {
    id
    fuelyConfig {
      knowledgeBase {
        businessHoursSchedule {
          workingHours {
            day
            enabled
            start
            end
          }
        }
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetBusinessHoursMutation, KbSetBusinessHoursMutationVariables>;
export const KbSetFaQsDocument = new TypedDocumentString(`
mutation KBSetFAQs($botID: BotID!, $faqs: [FuelyKnowledgeBaseFAQInput!]!) {
  fuelyConfigSetFAQs(botID: $botID, faqs: $faqs) {
    id
    fuelyConfig {
      knowledgeBase {
        faqs {
          question
          answer
        }
      }
      usage {
        total
        catalog
      }
    }
  }
}`) as unknown as TypedDocumentString<KbSetFaQsMutation, KbSetFaQsMutationVariables>;
export const GoodsProductCreateDocument = new TypedDocumentString(`
mutation GoodsProductCreate($botID: BotID!, $product: GoodsProductInput!) {
  goodsProductCreate(botID: $botID, product: $product) {
    id
    goodsCatalog {
      __typename
      ...GoodsProductInfo
      ...GoodsServiceInfo
    }
    fuelyConfig {
      usage {
        total
        catalog
      }
    }
  }
}
${KbFileInfoFragmentDoc}
${GoodsProductInfoFragmentDoc}
${GoodsServiceInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsProductCreateMutation, GoodsProductCreateMutationVariables>;
export const GoodsProductUpdateDocument = new TypedDocumentString(`
mutation GoodsProductUpdate($botID: BotID!, $itemID: GoodsItemID!, $product: GoodsProductInput!) {
  goodsProductUpdate(botID: $botID, itemID: $itemID, product: $product) {
    ...GoodsProductInfo
  }
}
${KbFileInfoFragmentDoc}
${GoodsProductInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsProductUpdateMutation, GoodsProductUpdateMutationVariables>;
export const GoodsProductDeleteDocument = new TypedDocumentString(`
mutation GoodsProductDelete($botID: BotID!, $itemID: GoodsItemID!) {
  goodsProductDelete(botID: $botID, itemID: $itemID) {
    id
    goodsCatalog {
      __typename
      ...GoodsProductInfo
      ...GoodsServiceInfo
    }
    fuelyConfig {
      usage {
        total
        catalog
      }
    }
  }
}
${KbFileInfoFragmentDoc}
${GoodsProductInfoFragmentDoc}
${GoodsServiceInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsProductDeleteMutation, GoodsProductDeleteMutationVariables>;
export const GoodsServiceCreateDocument = new TypedDocumentString(`
mutation GoodsServiceCreate($botID: BotID!, $service: GoodsServiceInput!) {
  goodsServiceCreate(botID: $botID, service: $service) {
    id
    goodsCatalog {
      __typename
      ...GoodsProductInfo
      ...GoodsServiceInfo
    }
    fuelyConfig {
      usage {
        total
        catalog
      }
    }
  }
}
${KbFileInfoFragmentDoc}
${GoodsProductInfoFragmentDoc}
${GoodsServiceInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsServiceCreateMutation, GoodsServiceCreateMutationVariables>;
export const GoodsServiceUpdateDocument = new TypedDocumentString(`
mutation GoodsServiceUpdate($botID: BotID!, $itemID: GoodsItemID!, $service: GoodsServiceInput!) {
  goodsServiceUpdate(botID: $botID, itemID: $itemID, service: $service) {
    ...GoodsServiceInfo
  }
}
${KbFileInfoFragmentDoc}
${GoodsServiceInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsServiceUpdateMutation, GoodsServiceUpdateMutationVariables>;
export const GoodsServiceDeleteDocument = new TypedDocumentString(`
mutation GoodsServiceDelete($botID: BotID!, $itemID: GoodsItemID!) {
  goodsServiceDelete(botID: $botID, itemID: $itemID) {
    id
    goodsCatalog {
      __typename
      ...GoodsProductInfo
      ...GoodsServiceInfo
    }
    fuelyConfig {
      usage {
        total
        catalog
      }
    }
  }
}
${KbFileInfoFragmentDoc}
${GoodsProductInfoFragmentDoc}
${GoodsServiceInfoFragmentDoc}`) as unknown as TypedDocumentString<GoodsServiceDeleteMutation, GoodsServiceDeleteMutationVariables>;
export const SpecialistCreateDocument = new TypedDocumentString(`
mutation SpecialistCreate($botID: BotID!, $info: SpecialistInfoInput!) {
  specialistCreate(botID: $botID, info: $info) {
    id
    specialists {
      ...SpecialistInfo
    }
  }
}
${KbFileInfoFragmentDoc}
${KbSpecialistDayFragmentDoc}
${SpecialistInfoFragmentDoc}`) as unknown as TypedDocumentString<SpecialistCreateMutation, SpecialistCreateMutationVariables>;
export const SpecialistUpdateDocument = new TypedDocumentString(`
mutation SpecialistUpdate($botID: BotID!, $specialistID: SpecialistID!, $info: SpecialistInfoInput!) {
  specialistUpdate(botID: $botID, specialistID: $specialistID, info: $info) {
    ...SpecialistInfo
  }
}
${KbFileInfoFragmentDoc}
${KbSpecialistDayFragmentDoc}
${SpecialistInfoFragmentDoc}`) as unknown as TypedDocumentString<SpecialistUpdateMutation, SpecialistUpdateMutationVariables>;
export const SpecialistDeleteDocument = new TypedDocumentString(`
mutation SpecialistDelete($botID: BotID!, $specialistID: SpecialistID!) {
  specialistDelete(botID: $botID, specialistID: $specialistID) {
    id
    specialists {
      ...SpecialistInfo
    }
  }
}
${KbFileInfoFragmentDoc}
${KbSpecialistDayFragmentDoc}
${SpecialistInfoFragmentDoc}`) as unknown as TypedDocumentString<SpecialistDeleteMutation, SpecialistDeleteMutationVariables>;