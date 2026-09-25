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
  OpenAIModel: { input: string; output: string; }
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
  OpenAiModelNotAvailable = 'OpenAIModelNotAvailable',
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

export type FacebookPreviewResponsesPostCommentSendInput = {
  clientId?: InputMaybe<Scalars['ClientMID']['input']>;
  postMessage: Scalars['String']['input'];
  text: Scalars['String']['input'];
};

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
  Facebook = 'facebook',
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

export type BroadcastFileRefFragment = { __typename?: 'File', id: string, url: string, type: FileType, status: FileStatus, size?: number | null };

export type BroadcastAttrRefFragment = { __typename?: 'BotAttribute', name: string, type: AttributeType, dataType: AttributeDataType };

export type BroadcastTplStrFragment = { __typename?: 'TemplateStr', parts: Array<{ __typename: 'TemplateStrAttribute', errCode?: string | null, attribute: (
      { __typename?: 'BotAttribute' }
      & BroadcastAttrRefFragment
    ) } | { __typename: 'TemplateStrText', text: string, errCode?: string | null }> };

export type BroadcastTplTextFragment = { __typename?: 'WhatsAppTemplateComponentText', text?: Array<{ __typename: 'WhatsAppTemplateComponentTextPartParam', name: string, value: (
      { __typename?: 'TemplateStr' }
      & BroadcastTplStrFragment
    ) } | { __typename: 'WhatsAppTemplateComponentTextPartText', text?: string | null }> | null };

type BroadcastTplHeader_WhatsAppTemplateComponentDocument_Fragment = { __typename: 'WhatsAppTemplateComponentDocument', fileName?: string | null, document?: (
    { __typename?: 'File' }
    & BroadcastFileRefFragment
  ) | null };

type BroadcastTplHeader_WhatsAppTemplateComponentImage_Fragment = { __typename: 'WhatsAppTemplateComponentImage', image?: (
    { __typename?: 'File' }
    & BroadcastFileRefFragment
  ) | null };

type BroadcastTplHeader_WhatsAppTemplateComponentText_Fragment = (
  { __typename: 'WhatsAppTemplateComponentText' }
  & BroadcastTplTextFragment
);

type BroadcastTplHeader_WhatsAppTemplateComponentVideo_Fragment = { __typename: 'WhatsAppTemplateComponentVideo', video?: (
    { __typename?: 'File' }
    & BroadcastFileRefFragment
  ) | null };

export type BroadcastTplHeaderFragment = BroadcastTplHeader_WhatsAppTemplateComponentDocument_Fragment | BroadcastTplHeader_WhatsAppTemplateComponentImage_Fragment | BroadcastTplHeader_WhatsAppTemplateComponentText_Fragment | BroadcastTplHeader_WhatsAppTemplateComponentVideo_Fragment;

type BroadcastTplConfigHeader_WhatsAppTemplateComponentDocument_Fragment = { __typename: 'WhatsAppTemplateComponentDocument', fileName?: string | null, document?: (
    { __typename?: 'File' }
    & BroadcastFileRefFragment
  ) | null };

type BroadcastTplConfigHeader_WhatsAppTemplateComponentImage_Fragment = { __typename: 'WhatsAppTemplateComponentImage', image?: (
    { __typename?: 'File' }
    & BroadcastFileRefFragment
  ) | null };

type BroadcastTplConfigHeader_WhatsAppTemplateComponentText_Fragment = (
  { __typename: 'WhatsAppTemplateComponentText' }
  & BroadcastTplTextFragment
);

type BroadcastTplConfigHeader_WhatsAppTemplateComponentVideo_Fragment = { __typename: 'WhatsAppTemplateComponentVideo', video?: (
    { __typename?: 'File' }
    & BroadcastFileRefFragment
  ) | null };

export type BroadcastTplConfigHeaderFragment = BroadcastTplConfigHeader_WhatsAppTemplateComponentDocument_Fragment | BroadcastTplConfigHeader_WhatsAppTemplateComponentImage_Fragment | BroadcastTplConfigHeader_WhatsAppTemplateComponentText_Fragment | BroadcastTplConfigHeader_WhatsAppTemplateComponentVideo_Fragment;

type BroadcastTplButton_WhatsAppTemplateCallPhoneButton_Fragment = { __typename: 'WhatsAppTemplateCallPhoneButton', text: string, phoneNumber: string };

type BroadcastTplButton_WhatsAppTemplateCopyCodeButton_Fragment = { __typename: 'WhatsAppTemplateCopyCodeButton', id: string, text: string, code: (
    { __typename?: 'TemplateStr' }
    & BroadcastTplStrFragment
  ) };

type BroadcastTplButton_WhatsAppTemplateQuickReplyButton_Fragment = { __typename: 'WhatsAppTemplateQuickReplyButton', id: string, text: string };

type BroadcastTplButton_WhatsAppTemplateUrlButton_Fragment = { __typename: 'WhatsAppTemplateURLButton', id: string, text: string, url?: Array<{ __typename: 'WhatsAppTemplateComponentTextPartParam', name: string, value: (
      { __typename?: 'TemplateStr' }
      & BroadcastTplStrFragment
    ) } | { __typename: 'WhatsAppTemplateComponentTextPartText', text?: string | null }> | null };

type BroadcastTplButton_WhatsAppTemplateWhatsAppCallButton_Fragment = { __typename: 'WhatsAppTemplateWhatsAppCallButton', text: string };

export type BroadcastTplButtonFragment = BroadcastTplButton_WhatsAppTemplateCallPhoneButton_Fragment | BroadcastTplButton_WhatsAppTemplateCopyCodeButton_Fragment | BroadcastTplButton_WhatsAppTemplateQuickReplyButton_Fragment | BroadcastTplButton_WhatsAppTemplateUrlButton_Fragment | BroadcastTplButton_WhatsAppTemplateWhatsAppCallButton_Fragment;

export type BroadcastCatalogTemplateFragment = { __typename?: 'WhatsAppTemplate', id: string, name: string, status: WhatsAppTemplateStatus, language: WhatsAppTemplateLanguage, category: WhatsAppTemplateCategory, IsSupportedInFlowbuilder: boolean, header?: (
    { __typename?: 'WhatsAppTemplateComponentDocument' }
    & BroadcastTplHeader_WhatsAppTemplateComponentDocument_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateComponentImage' }
    & BroadcastTplHeader_WhatsAppTemplateComponentImage_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateComponentText' }
    & BroadcastTplHeader_WhatsAppTemplateComponentText_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateComponentVideo' }
    & BroadcastTplHeader_WhatsAppTemplateComponentVideo_Fragment
  ) | null, body: (
    { __typename?: 'WhatsAppTemplateComponentText' }
    & BroadcastTplTextFragment
  ), footer?: (
    { __typename?: 'WhatsAppTemplateComponentText' }
    & BroadcastTplTextFragment
  ) | null, buttons: Array<(
    { __typename?: 'WhatsAppTemplateCallPhoneButton' }
    & BroadcastTplButton_WhatsAppTemplateCallPhoneButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateCopyCodeButton' }
    & BroadcastTplButton_WhatsAppTemplateCopyCodeButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateQuickReplyButton' }
    & BroadcastTplButton_WhatsAppTemplateQuickReplyButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateURLButton' }
    & BroadcastTplButton_WhatsAppTemplateUrlButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateWhatsAppCallButton' }
    & BroadcastTplButton_WhatsAppTemplateWhatsAppCallButton_Fragment
  )> };

export type BroadcastTemplateConfigFragment = { __typename?: 'WhatsAppTemplateConfig', templateID: string, name: string, status: WhatsAppTemplateStatus, header?: (
    { __typename?: 'WhatsAppTemplateComponentDocument' }
    & BroadcastTplConfigHeader_WhatsAppTemplateComponentDocument_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateComponentImage' }
    & BroadcastTplConfigHeader_WhatsAppTemplateComponentImage_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateComponentText' }
    & BroadcastTplConfigHeader_WhatsAppTemplateComponentText_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateComponentVideo' }
    & BroadcastTplConfigHeader_WhatsAppTemplateComponentVideo_Fragment
  ) | null, body: (
    { __typename?: 'WhatsAppTemplateComponentText' }
    & BroadcastTplTextFragment
  ), footer?: (
    { __typename?: 'WhatsAppTemplateComponentText' }
    & BroadcastTplTextFragment
  ) | null, buttons: Array<(
    { __typename?: 'WhatsAppTemplateCallPhoneButton' }
    & BroadcastTplButton_WhatsAppTemplateCallPhoneButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateCopyCodeButton' }
    & BroadcastTplButton_WhatsAppTemplateCopyCodeButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateQuickReplyButton' }
    & BroadcastTplButton_WhatsAppTemplateQuickReplyButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateURLButton' }
    & BroadcastTplButton_WhatsAppTemplateUrlButton_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateWhatsAppCallButton' }
    & BroadcastTplButton_WhatsAppTemplateWhatsAppCallButton_Fragment
  )> };

export type BroadcastSegmentFilterFragment = { __typename?: 'Filter', id: string, byAttribute?: { __typename?: 'AttrFilter', attribute: (
      { __typename?: 'BotAttribute' }
      & BroadcastAttrRefFragment
    ), defaultStrategy?: { __typename?: 'AttrFilterDefaultStrategy', operator: AttrFilterDefaultOperator, comparableValues: Array<string> } | null, dateStrategy?: { __typename?: 'AttrFilterDateStrategy', operator: AttrFilterDateOperator, comparableDate?: string | null } | null } | null, byTag?: { __typename?: 'TagFilter', operator: TagFilterOperator, tagNames: Array<string> } | null, byStoredSegment?: { __typename?: 'StoredSegmentFilter', operator: StoredSegmentFilterOperator, segmentIDs: Array<string> } | null };

export type BroadcastSegmentFragment = { __typename?: 'Segment', id: string, name?: string | null, resultOperator: BoolOperator, filters: Array<(
    { __typename?: 'Filter', byInFlightSegment?: { __typename?: 'Segment', id: string, name?: string | null, resultOperator: BoolOperator, filters: Array<(
        { __typename?: 'Filter', byInFlightSegment?: { __typename?: 'Segment', id: string, name?: string | null, resultOperator: BoolOperator, filters: Array<(
            { __typename?: 'Filter' }
            & BroadcastSegmentFilterFragment
          )> } | null }
        & BroadcastSegmentFilterFragment
      )> } | null }
    & BroadcastSegmentFilterFragment
  )> };

type BroadcastElementErrors_AiAgentBlockElement_Fragment = { __typename?: 'AiAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_AiAgentCustomBlockElement_Fragment = { __typename?: 'AiAgentCustomBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_ClearContactPropertyBlockElement_Fragment = { __typename?: 'ClearContactPropertyBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_DefaultReplyBlockElement_Fragment = { __typename?: 'DefaultReplyBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_FuelyAiAgentBlockElement_Fragment = { __typename?: 'FuelyAIAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_RedirectToFlowBlockElement_Fragment = { __typename?: 'RedirectToFlowBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_SendJsonBlockElement_Fragment = { __typename?: 'SendJsonBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_SetConditionBlockElement_Fragment = { __typename?: 'SetConditionBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_SetContactPropertyBlockElement_Fragment = { __typename?: 'SetContactPropertyBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_SummarizeChatBlockElement_Fragment = { __typename?: 'SummarizeChatBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_TriggeredMessageBlockElement_Fragment = { __typename?: 'TriggeredMessageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppAudioBlockElement_Fragment = { __typename?: 'WhatsAppAudioBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppDocumentBlockElement_Fragment = { __typename?: 'WhatsAppDocumentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppImageBlockElement_Fragment = { __typename?: 'WhatsAppImageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppListBlockElement_Fragment = { __typename?: 'WhatsAppListBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppOneTimeNotificationBlockElement_Fragment = { __typename?: 'WhatsAppOneTimeNotificationBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppScheduledMessageBlockElement_Fragment = { __typename?: 'WhatsAppScheduledMessageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppTemplateBlockElement_Fragment = { __typename?: 'WhatsAppTemplateBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppTextAndButtonsBlockElement_Fragment = { __typename?: 'WhatsAppTextAndButtonsBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppTextAndUrlBlockElement_Fragment = { __typename?: 'WhatsAppTextAndURLBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppTextBlockElement_Fragment = { __typename?: 'WhatsAppTextBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WhatsAppVideoBlockElement_Fragment = { __typename?: 'WhatsAppVideoBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WidgetEntryPointBlockElement_Fragment = { __typename?: 'WidgetEntryPointBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WidgetImageBlockElement_Fragment = { __typename?: 'WidgetImageBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment = { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

type BroadcastElementErrors_WidgetTextAndButtonBlockElement_Fragment = { __typename?: 'WidgetTextAndButtonBlockElement', errors: Array<{ __typename: 'AiAgentRuleError', code: string, message?: string | null } | { __typename: 'ButtonValidationError', code: string, message?: string | null } | { __typename: 'ComponentProcessingError', code: string, message?: string | null } | { __typename: 'ComponentValidationError', code: string, message?: string | null } | { __typename: 'MainTextValidationError', code: string, message?: string | null } | { __typename: 'SendJsonHeaderError', code: string, message?: string | null } | { __typename: 'SendJsonResponseParsingRuleError', code: string, message?: string | null } | { __typename: 'SendJsonURLParamError', code: string, message?: string | null } | { __typename: 'SummarizeChatEntryValidationError', code: string, message?: string | null } | { __typename: 'WhatsAppTemplateParamValueRequiredError', paramName: string, code: string, message?: string | null } | { __typename: 'WhatsAppTemplateURLButtonParamValueRequiredError', buttonID: string, paramName: string, code: string, message?: string | null }> };

export type BroadcastElementErrorsFragment = BroadcastElementErrors_AiAgentBlockElement_Fragment | BroadcastElementErrors_AiAgentCustomBlockElement_Fragment | BroadcastElementErrors_ClearContactPropertyBlockElement_Fragment | BroadcastElementErrors_DefaultReplyBlockElement_Fragment | BroadcastElementErrors_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElementErrors_FuelyAiAgentBlockElement_Fragment | BroadcastElementErrors_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElementErrors_RedirectToFlowBlockElement_Fragment | BroadcastElementErrors_SendJsonBlockElement_Fragment | BroadcastElementErrors_SetConditionBlockElement_Fragment | BroadcastElementErrors_SetContactPropertyBlockElement_Fragment | BroadcastElementErrors_SummarizeChatBlockElement_Fragment | BroadcastElementErrors_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElementErrors_TriggeredMessageBlockElement_Fragment | BroadcastElementErrors_WhatsAppAudioBlockElement_Fragment | BroadcastElementErrors_WhatsAppDocumentBlockElement_Fragment | BroadcastElementErrors_WhatsAppImageBlockElement_Fragment | BroadcastElementErrors_WhatsAppListBlockElement_Fragment | BroadcastElementErrors_WhatsAppOneTimeNotificationBlockElement_Fragment | BroadcastElementErrors_WhatsAppScheduledMessageBlockElement_Fragment | BroadcastElementErrors_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElementErrors_WhatsAppTemplateBlockElement_Fragment | BroadcastElementErrors_WhatsAppTextAndButtonsBlockElement_Fragment | BroadcastElementErrors_WhatsAppTextAndUrlBlockElement_Fragment | BroadcastElementErrors_WhatsAppTextBlockElement_Fragment | BroadcastElementErrors_WhatsAppVideoBlockElement_Fragment | BroadcastElementErrors_WidgetEntryPointBlockElement_Fragment | BroadcastElementErrors_WidgetImageBlockElement_Fragment | BroadcastElementErrors_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElementErrors_WidgetTextAndButtonBlockElement_Fragment;

type BroadcastElement_AiAgentBlockElement_Fragment = (
  { __typename: 'AiAgentBlockElement', id: string }
  & BroadcastElementErrors_AiAgentBlockElement_Fragment
);

type BroadcastElement_AiAgentCustomBlockElement_Fragment = (
  { __typename: 'AiAgentCustomBlockElement', id: string }
  & BroadcastElementErrors_AiAgentCustomBlockElement_Fragment
);

type BroadcastElement_ClearContactPropertyBlockElement_Fragment = (
  { __typename: 'ClearContactPropertyBlockElement', id: string }
  & BroadcastElementErrors_ClearContactPropertyBlockElement_Fragment
);

type BroadcastElement_DefaultReplyBlockElement_Fragment = (
  { __typename: 'DefaultReplyBlockElement', id: string }
  & BroadcastElementErrors_DefaultReplyBlockElement_Fragment
);

type BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'FacebookSwitchToChatWithHumanAgentBlockElement', id: string }
  & BroadcastElementErrors_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
);

type BroadcastElement_FuelyAiAgentBlockElement_Fragment = (
  { __typename: 'FuelyAIAgentBlockElement', id: string }
  & BroadcastElementErrors_FuelyAiAgentBlockElement_Fragment
);

type BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'InstagramSwitchToChatWithHumanAgentBlockElement', id: string }
  & BroadcastElementErrors_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
);

type BroadcastElement_RedirectToFlowBlockElement_Fragment = (
  { __typename: 'RedirectToFlowBlockElement', id: string }
  & BroadcastElementErrors_RedirectToFlowBlockElement_Fragment
);

type BroadcastElement_SendJsonBlockElement_Fragment = (
  { __typename: 'SendJsonBlockElement', id: string }
  & BroadcastElementErrors_SendJsonBlockElement_Fragment
);

type BroadcastElement_SetConditionBlockElement_Fragment = (
  { __typename: 'SetConditionBlockElement', id: string }
  & BroadcastElementErrors_SetConditionBlockElement_Fragment
);

type BroadcastElement_SetContactPropertyBlockElement_Fragment = (
  { __typename: 'SetContactPropertyBlockElement', id: string }
  & BroadcastElementErrors_SetContactPropertyBlockElement_Fragment
);

type BroadcastElement_SummarizeChatBlockElement_Fragment = (
  { __typename: 'SummarizeChatBlockElement', id: string }
  & BroadcastElementErrors_SummarizeChatBlockElement_Fragment
);

type BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'TikTokSwitchToChatWithHumanAgentBlockElement', id: string }
  & BroadcastElementErrors_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
);

type BroadcastElement_TriggeredMessageBlockElement_Fragment = (
  { __typename: 'TriggeredMessageBlockElement', id: string }
  & BroadcastElementErrors_TriggeredMessageBlockElement_Fragment
);

type BroadcastElement_WhatsAppAudioBlockElement_Fragment = (
  { __typename: 'WhatsAppAudioBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppAudioBlockElement_Fragment
);

type BroadcastElement_WhatsAppDocumentBlockElement_Fragment = (
  { __typename: 'WhatsAppDocumentBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppDocumentBlockElement_Fragment
);

type BroadcastElement_WhatsAppImageBlockElement_Fragment = (
  { __typename: 'WhatsAppImageBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppImageBlockElement_Fragment
);

type BroadcastElement_WhatsAppListBlockElement_Fragment = (
  { __typename: 'WhatsAppListBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppListBlockElement_Fragment
);

type BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment = (
  { __typename: 'WhatsAppOneTimeNotificationBlockElement', status: BroadcastStatus, sentToContactsCount?: number | null, id: string, segment: (
    { __typename?: 'Segment' }
    & BroadcastSegmentFragment
  ), segmentErrors: Array<{ __typename?: 'FilterValidationError', filterID?: string | null, code: FilterErrCode }> }
  & BroadcastElementErrors_WhatsAppOneTimeNotificationBlockElement_Fragment
);

type BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment = (
  { __typename: 'WhatsAppScheduledMessageBlockElement', status: BroadcastStatus, firstSendTime: string, repeatType: BroadcastRepeatType, repeatOnWeekdays: Array<Weekday>, repeatEveryNDays?: number | null, repeatOnCertainDates: Array<string>, id: string, segment: (
    { __typename?: 'Segment' }
    & BroadcastSegmentFragment
  ), segmentErrors: Array<{ __typename?: 'FilterValidationError', filterID?: string | null, code: FilterErrCode }> }
  & BroadcastElementErrors_WhatsAppScheduledMessageBlockElement_Fragment
);

type BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'WhatsAppSwitchToChatWithHumanAgentBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
);

type BroadcastElement_WhatsAppTemplateBlockElement_Fragment = (
  { __typename: 'WhatsAppTemplateBlockElement', waitForReplies: boolean, saveContactReply: boolean, id: string, whatsAppTemplate?: (
    { __typename?: 'WhatsAppTemplateConfig' }
    & BroadcastTemplateConfigFragment
  ) | null }
  & BroadcastElementErrors_WhatsAppTemplateBlockElement_Fragment
);

type BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment = (
  { __typename: 'WhatsAppTextAndButtonsBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppTextAndButtonsBlockElement_Fragment
);

type BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment = (
  { __typename: 'WhatsAppTextAndURLBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppTextAndUrlBlockElement_Fragment
);

type BroadcastElement_WhatsAppTextBlockElement_Fragment = (
  { __typename: 'WhatsAppTextBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppTextBlockElement_Fragment
);

type BroadcastElement_WhatsAppVideoBlockElement_Fragment = (
  { __typename: 'WhatsAppVideoBlockElement', id: string }
  & BroadcastElementErrors_WhatsAppVideoBlockElement_Fragment
);

type BroadcastElement_WidgetEntryPointBlockElement_Fragment = (
  { __typename: 'WidgetEntryPointBlockElement', id: string }
  & BroadcastElementErrors_WidgetEntryPointBlockElement_Fragment
);

type BroadcastElement_WidgetImageBlockElement_Fragment = (
  { __typename: 'WidgetImageBlockElement', id: string }
  & BroadcastElementErrors_WidgetImageBlockElement_Fragment
);

type BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment = (
  { __typename: 'WidgetSwitchToChatWithHumanAgentBlockElement', id: string }
  & BroadcastElementErrors_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
);

type BroadcastElement_WidgetTextAndButtonBlockElement_Fragment = (
  { __typename: 'WidgetTextAndButtonBlockElement', id: string }
  & BroadcastElementErrors_WidgetTextAndButtonBlockElement_Fragment
);

export type BroadcastElementFragment = BroadcastElement_AiAgentBlockElement_Fragment | BroadcastElement_AiAgentCustomBlockElement_Fragment | BroadcastElement_ClearContactPropertyBlockElement_Fragment | BroadcastElement_DefaultReplyBlockElement_Fragment | BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElement_FuelyAiAgentBlockElement_Fragment | BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElement_RedirectToFlowBlockElement_Fragment | BroadcastElement_SendJsonBlockElement_Fragment | BroadcastElement_SetConditionBlockElement_Fragment | BroadcastElement_SetContactPropertyBlockElement_Fragment | BroadcastElement_SummarizeChatBlockElement_Fragment | BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElement_TriggeredMessageBlockElement_Fragment | BroadcastElement_WhatsAppAudioBlockElement_Fragment | BroadcastElement_WhatsAppDocumentBlockElement_Fragment | BroadcastElement_WhatsAppImageBlockElement_Fragment | BroadcastElement_WhatsAppListBlockElement_Fragment | BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment | BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment | BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElement_WhatsAppTemplateBlockElement_Fragment | BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment | BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment | BroadcastElement_WhatsAppTextBlockElement_Fragment | BroadcastElement_WhatsAppVideoBlockElement_Fragment | BroadcastElement_WidgetEntryPointBlockElement_Fragment | BroadcastElement_WidgetImageBlockElement_Fragment | BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment | BroadcastElement_WidgetTextAndButtonBlockElement_Fragment;

type BroadcastBlock_AiAgentBlock_Fragment = { __typename: 'AiAgentBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_ClearContactPropertyBlock_Fragment = { __typename: 'ClearContactPropertyBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_DefaultReplyBlock_Fragment = { __typename: 'DefaultReplyBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_RedirectToFlowBlock_Fragment = { __typename: 'RedirectToFlowBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_RegularActionBlock_Fragment = { __typename: 'RegularActionBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_RegularContentBlock_Fragment = { __typename: 'RegularContentBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_SetConditionBlock_Fragment = { __typename: 'SetConditionBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_SetContactPropertyBlock_Fragment = { __typename: 'SetContactPropertyBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_TriggeredMessageBlock_Fragment = { __typename: 'TriggeredMessageBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WhatsAppListBlock_Fragment = { __typename: 'WhatsAppListBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WhatsAppOneTimeNotificationBlock_Fragment = { __typename: 'WhatsAppOneTimeNotificationBlock', isEntryPointEnabled: boolean, id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment = { __typename: 'WhatsAppScheduledMessageBlock', isEntryPointEnabled: boolean, id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WhatsAppTemplateBlock_Fragment = { __typename: 'WhatsAppTemplateBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment = { __typename: 'WhatsAppTextAndButtonsBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment = { __typename: 'WhatsAppTextAndURLBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

type BroadcastBlock_WidgetEntryPointBlock_Fragment = { __typename: 'WidgetEntryPointBlock', id: string, name: string, blockElements: Array<(
    { __typename?: 'AiAgentBlockElement' }
    & BroadcastElement_AiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'AiAgentCustomBlockElement' }
    & BroadcastElement_AiAgentCustomBlockElement_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlockElement' }
    & BroadcastElement_ClearContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlockElement' }
    & BroadcastElement_DefaultReplyBlockElement_Fragment
  ) | (
    { __typename?: 'FacebookSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_FacebookSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'FuelyAIAgentBlockElement' }
    & BroadcastElement_FuelyAiAgentBlockElement_Fragment
  ) | (
    { __typename?: 'InstagramSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_InstagramSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlockElement' }
    & BroadcastElement_RedirectToFlowBlockElement_Fragment
  ) | (
    { __typename?: 'SendJsonBlockElement' }
    & BroadcastElement_SendJsonBlockElement_Fragment
  ) | (
    { __typename?: 'SetConditionBlockElement' }
    & BroadcastElement_SetConditionBlockElement_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlockElement' }
    & BroadcastElement_SetContactPropertyBlockElement_Fragment
  ) | (
    { __typename?: 'SummarizeChatBlockElement' }
    & BroadcastElement_SummarizeChatBlockElement_Fragment
  ) | (
    { __typename?: 'TikTokSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_TikTokSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlockElement' }
    & BroadcastElement_TriggeredMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppAudioBlockElement' }
    & BroadcastElement_WhatsAppAudioBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppDocumentBlockElement' }
    & BroadcastElement_WhatsAppDocumentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppImageBlockElement' }
    & BroadcastElement_WhatsAppImageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlockElement' }
    & BroadcastElement_WhatsAppListBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlockElement' }
    & BroadcastElement_WhatsAppOneTimeNotificationBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlockElement' }
    & BroadcastElement_WhatsAppScheduledMessageBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WhatsAppSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlockElement' }
    & BroadcastElement_WhatsAppTemplateBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlockElement' }
    & BroadcastElement_WhatsAppTextAndButtonsBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlockElement' }
    & BroadcastElement_WhatsAppTextAndUrlBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppTextBlockElement' }
    & BroadcastElement_WhatsAppTextBlockElement_Fragment
  ) | (
    { __typename?: 'WhatsAppVideoBlockElement' }
    & BroadcastElement_WhatsAppVideoBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlockElement' }
    & BroadcastElement_WidgetEntryPointBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetImageBlockElement' }
    & BroadcastElement_WidgetImageBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetSwitchToChatWithHumanAgentBlockElement' }
    & BroadcastElement_WidgetSwitchToChatWithHumanAgentBlockElement_Fragment
  ) | (
    { __typename?: 'WidgetTextAndButtonBlockElement' }
    & BroadcastElement_WidgetTextAndButtonBlockElement_Fragment
  )> };

export type BroadcastBlockFragment = BroadcastBlock_AiAgentBlock_Fragment | BroadcastBlock_ClearContactPropertyBlock_Fragment | BroadcastBlock_DefaultReplyBlock_Fragment | BroadcastBlock_RedirectToFlowBlock_Fragment | BroadcastBlock_RegularActionBlock_Fragment | BroadcastBlock_RegularContentBlock_Fragment | BroadcastBlock_SetConditionBlock_Fragment | BroadcastBlock_SetContactPropertyBlock_Fragment | BroadcastBlock_TriggeredMessageBlock_Fragment | BroadcastBlock_WhatsAppListBlock_Fragment | BroadcastBlock_WhatsAppOneTimeNotificationBlock_Fragment | BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment | BroadcastBlock_WhatsAppTemplateBlock_Fragment | BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment | BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment | BroadcastBlock_WidgetEntryPointBlock_Fragment;

type BroadcastConnection_BlockToBlockConnection_Fragment = { __typename: 'BlockToBlockConnection', id: string, sourceBlockID: string, targetBlockID: string };

type BroadcastConnection_ComponentToBlockConnection_Fragment = { __typename: 'ComponentToBlockConnection', id: string, sourceBlockID: string, sourceBlockElementID: string, sourceHandleID: string, targetBlockID: string };

export type BroadcastConnectionFragment = BroadcastConnection_BlockToBlockConnection_Fragment | BroadcastConnection_ComponentToBlockConnection_Fragment;

type BroadcastFlow_DefaultReplyFlow_Fragment = { __typename: 'DefaultReplyFlow', id: string, name: string, platform: Platform, createdAt: string, entryPoints: Array<{ __typename: 'DefaultReplyBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'TriggeredMessageBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppOneTimeNotificationBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppScheduledMessageBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'WidgetEntryPointBlock', id: string, isEntryPointEnabled: boolean }>, blocks: Array<(
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlock' }
    & BroadcastBlock_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlock' }
    & BroadcastBlock_DefaultReplyBlock_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlock' }
    & BroadcastBlock_RedirectToFlowBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BroadcastBlock_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BroadcastBlock_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BroadcastBlock_SetContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlock' }
    & BroadcastBlock_TriggeredMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BroadcastBlock_WhatsAppOneTimeNotificationBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlock' }
    & BroadcastBlock_WidgetEntryPointBlock_Fragment
  )>, connections: Array<(
    { __typename?: 'BlockToBlockConnection' }
    & BroadcastConnection_BlockToBlockConnection_Fragment
  ) | (
    { __typename?: 'ComponentToBlockConnection' }
    & BroadcastConnection_ComponentToBlockConnection_Fragment
  )> };

type BroadcastFlow_RegularFlow_Fragment = { __typename: 'RegularFlow', id: string, name: string, platform: Platform, createdAt: string, entryPoints: Array<{ __typename: 'DefaultReplyBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'TriggeredMessageBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppOneTimeNotificationBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'WhatsAppScheduledMessageBlock', id: string, isEntryPointEnabled: boolean } | { __typename: 'WidgetEntryPointBlock', id: string, isEntryPointEnabled: boolean }>, blocks: Array<(
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'ClearContactPropertyBlock' }
    & BroadcastBlock_ClearContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'DefaultReplyBlock' }
    & BroadcastBlock_DefaultReplyBlock_Fragment
  ) | (
    { __typename?: 'RedirectToFlowBlock' }
    & BroadcastBlock_RedirectToFlowBlock_Fragment
  ) | (
    { __typename?: 'RegularActionBlock' }
    & BroadcastBlock_RegularActionBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'SetConditionBlock' }
    & BroadcastBlock_SetConditionBlock_Fragment
  ) | (
    { __typename?: 'SetContactPropertyBlock' }
    & BroadcastBlock_SetContactPropertyBlock_Fragment
  ) | (
    { __typename?: 'TriggeredMessageBlock' }
    & BroadcastBlock_TriggeredMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BroadcastBlock_WhatsAppOneTimeNotificationBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) | (
    { __typename?: 'WidgetEntryPointBlock' }
    & BroadcastBlock_WidgetEntryPointBlock_Fragment
  )>, connections: Array<(
    { __typename?: 'BlockToBlockConnection' }
    & BroadcastConnection_BlockToBlockConnection_Fragment
  ) | (
    { __typename?: 'ComponentToBlockConnection' }
    & BroadcastConnection_ComponentToBlockConnection_Fragment
  )> };

export type BroadcastFlowFragment = BroadcastFlow_DefaultReplyFlow_Fragment | BroadcastFlow_RegularFlow_Fragment;

export type BroadcastFlowsListQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BroadcastFlowsListQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, name: string, flows: Array<(
        { __typename?: 'RegularFlow' }
        & BroadcastFlow_RegularFlow_Fragment
      )> }>, flowsWithoutGroup: Array<(
      { __typename?: 'RegularFlow' }
      & BroadcastFlow_RegularFlow_Fragment
    )> } };

export type BroadcastFlowGetQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  flowID: Scalars['FlowID']['input'];
}>;


export type BroadcastFlowGetQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, flow: (
      { __typename?: 'DefaultReplyFlow' }
      & BroadcastFlow_DefaultReplyFlow_Fragment
    ) | (
      { __typename?: 'RegularFlow' }
      & BroadcastFlow_RegularFlow_Fragment
    ) } };

export type BroadcastTemplatesQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['WhatsAppTemplateCursor']['input']>;
}>;


export type BroadcastTemplatesQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, whatsAppTemplates?: { __typename?: 'WhatsappTemplates', edges: Array<{ __typename?: 'WhatsAppTemplateEdge', node: (
          { __typename?: 'WhatsAppTemplate' }
          & BroadcastCatalogTemplateFragment
        ) }>, pageInfo: { __typename?: 'WhatsappTemplatesPageInfo', hasNextPage: boolean, endCursor?: string | null } } | null } };

export type BroadcastAudienceCountQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  segment?: InputMaybe<SegmentInput>;
}>;


export type BroadcastAudienceCountQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, contactsTotalCount: number } };

export type BroadcastAttributesQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['BotAttributeCursor']['input']>;
  inputSubstring?: InputMaybe<Scalars['String']['input']>;
}>;


export type BroadcastAttributesQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, botAttributes: { __typename?: 'BotAttributeConnection', edges: Array<{ __typename?: 'BotAttributeEdge', node: { __typename?: 'BotAttributeNode', usersCount?: number | null, botAttribute: (
            { __typename?: 'BotAttribute' }
            & BroadcastAttrRefFragment
          ) } }>, pageInfo: { __typename?: 'BotAttributePageInfo', hasNextPage: boolean, endCursor?: string | null } } } };

export type BroadcastBotQueryVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BroadcastBotQuery = { __typename?: 'Query', bot: { __typename?: 'Bot', id: string, timezone?: string | null, contactScopes: Array<{ __typename: 'FacebookContactScope', id: string } | { __typename: 'InstagramAccountContactScope', id: string } | { __typename: 'TikTokAccountContactScope', id: string } | { __typename: 'WebWidgetContactScope', id: string } | { __typename: 'WhatsAppPhoneContactScope', id: string, phone: { __typename?: 'WhatsAppBusinessPhoneNumber', id: string, displayPhoneNumber: string, status?: WhatsAppPhoneStatus | null, whatsAppBusinessAccount: { __typename?: 'WhatsAppBusinessAccount', id: string, name?: string | null, facebookBusiness: { __typename?: 'FacebookBusiness', id: string, name: string } } } }> } };

export type BroadcastCreateFlowMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BroadcastCreateFlowMutation = { __typename?: 'Mutation', createFlow: { __typename?: 'Bot', id: string, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string, name: string }> } };

export type BroadcastRenameFlowMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  name: Scalars['String']['input'];
}>;


export type BroadcastRenameFlowMutation = { __typename?: 'Mutation', updateFlowName: (
    { __typename?: 'DefaultReplyFlow' }
    & BroadcastFlow_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & BroadcastFlow_RegularFlow_Fragment
  ) };

export type BroadcastDeleteFlowMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
}>;


export type BroadcastDeleteFlowMutation = { __typename?: 'Mutation', deleteFlow: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, name: string, flows: Array<{ __typename?: 'RegularFlow', id: string }> }>, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type BroadcastCreateGroupMutationVariables = Exact<{
  botID: Scalars['BotID']['input'];
}>;


export type BroadcastCreateGroupMutation = { __typename?: 'Mutation', createFlowGroup: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, name: string }> } };

export type BroadcastRenameGroupMutationVariables = Exact<{
  groupID: Scalars['FlowGroupID']['input'];
  name: Scalars['String']['input'];
}>;


export type BroadcastRenameGroupMutation = { __typename?: 'Mutation', updateFlowGroupName: { __typename?: 'FlowGroup', id: string, name: string } };

export type BroadcastMoveToGroupMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  groupID: Scalars['FlowGroupID']['input'];
}>;


export type BroadcastMoveToGroupMutation = { __typename?: 'Mutation', moveFlowToGroup: { __typename?: 'Bot', id: string, flowGroups: Array<{ __typename?: 'FlowGroup', id: string, name: string, flows: Array<{ __typename?: 'RegularFlow', id: string }> }>, flowsWithoutGroup: Array<{ __typename?: 'RegularFlow', id: string }> } };

export type BroadcastCreateOneTimeMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
}>;


export type BroadcastCreateOneTimeMutation = { __typename?: 'Mutation', whatsAppOneTimeNotificationCreateWithBlockAndWATemplate: (
    { __typename?: 'DefaultReplyFlow' }
    & BroadcastFlow_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & BroadcastFlow_RegularFlow_Fragment
  ) };

export type BroadcastCreateScheduledMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
}>;


export type BroadcastCreateScheduledMutation = { __typename?: 'Mutation', whatsAppScheduledMessageCreateWithBlockAndWATemplate: (
    { __typename?: 'DefaultReplyFlow' }
    & BroadcastFlow_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & BroadcastFlow_RegularFlow_Fragment
  ) };

export type BroadcastDeleteBlockMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type BroadcastDeleteBlockMutation = { __typename?: 'Mutation', deleteBlock: (
    { __typename?: 'DefaultReplyFlow' }
    & BroadcastFlow_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & BroadcastFlow_RegularFlow_Fragment
  ) };

export type BroadcastSetTemplateMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  templateID: Scalars['WhatsAppTemplateID']['input'];
}>;


export type BroadcastSetTemplateMutation = { __typename?: 'Mutation', whatsAppTemplateSetTemplate: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastClearTemplateMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type BroadcastClearTemplateMutation = { __typename?: 'Mutation', whatsAppTemplateDeleteTemplate: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetHeaderTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type BroadcastSetHeaderTextMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetBodyTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type BroadcastSetBodyTextMutation = { __typename?: 'Mutation', whatsAppTemplateSetBodyTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetFooterTextMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type BroadcastSetFooterTextMutation = { __typename?: 'Mutation', whatsAppTemplateSetFooterTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetHeaderImageMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
}>;


export type BroadcastSetHeaderImageMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderImageFile: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetHeaderVideoMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
}>;


export type BroadcastSetHeaderVideoMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderVideoFile: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetHeaderDocumentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  fileID: Scalars['FileID']['input'];
  fileName: Scalars['String']['input'];
}>;


export type BroadcastSetHeaderDocumentMutation = { __typename?: 'Mutation', whatsAppTemplateSetHeaderDocumentFile: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetUrlButtonParamMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  name: Scalars['WhatsAppTemplateTextParamName']['input'];
  value: Scalars['String']['input'];
}>;


export type BroadcastSetUrlButtonParamMutation = { __typename?: 'Mutation', whatsAppTemplateSetURLButtonTextParamValue: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetCopyCodeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  buttonID: Scalars['ComponentHandleID']['input'];
  codeValue: Scalars['String']['input'];
}>;


export type BroadcastSetCopyCodeMutation = { __typename?: 'Mutation', whatsAppTemplateSetCopyCodeButtonCodeValue: (
    { __typename?: 'AiAgentBlock' }
    & BroadcastBlock_AiAgentBlock_Fragment
  ) | (
    { __typename?: 'RegularContentBlock' }
    & BroadcastBlock_RegularContentBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppListBlock' }
    & BroadcastBlock_WhatsAppListBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTemplateBlock' }
    & BroadcastBlock_WhatsAppTemplateBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndButtonsBlock' }
    & BroadcastBlock_WhatsAppTextAndButtonsBlock_Fragment
  ) | (
    { __typename?: 'WhatsAppTextAndURLBlock' }
    & BroadcastBlock_WhatsAppTextAndUrlBlock_Fragment
  ) };

export type BroadcastSetOneTimeSegmentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  segment: SegmentInput;
}>;


export type BroadcastSetOneTimeSegmentMutation = { __typename?: 'Mutation', whatsAppOneTimeNotificationUpdateSegment: (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BroadcastBlock_WhatsAppOneTimeNotificationBlock_Fragment
  ) };

export type BroadcastSetScheduledSegmentMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  segment: SegmentInput;
}>;


export type BroadcastSetScheduledSegmentMutation = { __typename?: 'Mutation', whatsAppScheduledMessageUpdateSegment: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type BroadcastSendNowMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
}>;


export type BroadcastSendNowMutation = { __typename?: 'Mutation', whatsAppOneTimeNotificationSend: (
    { __typename?: 'WhatsAppOneTimeNotificationBlock' }
    & BroadcastBlock_WhatsAppOneTimeNotificationBlock_Fragment
  ) };

export type BroadcastSetRepeatTypeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  repeatType: BroadcastRepeatType;
}>;


export type BroadcastSetRepeatTypeMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetRepeatType: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type BroadcastSetWeekdaysMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  weekdays?: InputMaybe<Array<Weekday> | Weekday>;
}>;


export type BroadcastSetWeekdaysMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetWeekdays: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type BroadcastSetEveryNDaysMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  everyNDays: Scalars['Int']['input'];
}>;


export type BroadcastSetEveryNDaysMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetRepeatEveryNDays: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type BroadcastSetDatesMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  dates: Array<Scalars['Time']['input']> | Scalars['Time']['input'];
}>;


export type BroadcastSetDatesMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetOnCertainDates: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type BroadcastSetFirstSendTimeMutationVariables = Exact<{
  elementID: Scalars['BlockElementID']['input'];
  firstSendTime: Scalars['Time']['input'];
  correctedWeekdays: Array<Weekday> | Weekday;
}>;


export type BroadcastSetFirstSendTimeMutation = { __typename?: 'Mutation', whatsAppScheduledMessageSetFirstSendTime: (
    { __typename?: 'WhatsAppScheduledMessageBlock' }
    & BroadcastBlock_WhatsAppScheduledMessageBlock_Fragment
  ) };

export type BroadcastEnableMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type BroadcastEnableMutation = { __typename?: 'Mutation', blockEnableEntryPoint: (
    { __typename?: 'DefaultReplyFlow' }
    & BroadcastFlow_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & BroadcastFlow_RegularFlow_Fragment
  ) };

export type BroadcastDisableMutationVariables = Exact<{
  flowID: Scalars['FlowID']['input'];
  blockID: Scalars['BlockID']['input'];
}>;


export type BroadcastDisableMutation = { __typename?: 'Mutation', blockDisableEntryPoint: (
    { __typename?: 'DefaultReplyFlow' }
    & BroadcastFlow_DefaultReplyFlow_Fragment
  ) | (
    { __typename?: 'RegularFlow' }
    & BroadcastFlow_RegularFlow_Fragment
  ) };

export type BroadcastTemplatesRefetchMutationVariables = Exact<{ [key: string]: never; }>;


export type BroadcastTemplatesRefetchMutation = { __typename?: 'Mutation', whatsAppEntitiesStartRefetch: boolean };

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
export const BroadcastAttrRefFragmentDoc = new TypedDocumentString(`
fragment BroadcastAttrRef on BotAttribute {
  name
  type
  dataType
}`, {"fragmentName":"BroadcastAttrRef"}) as unknown as TypedDocumentString<BroadcastAttrRefFragment, unknown>;
export const BroadcastTplStrFragmentDoc = new TypedDocumentString(`
fragment BroadcastTplStr on TemplateStr {
  parts {
    __typename
    ... on TemplateStrText {
      text
      errCode
    }
    ... on TemplateStrAttribute {
      attribute {
        ...BroadcastAttrRef
      }
      errCode
    }
  }
}`, {"fragmentName":"BroadcastTplStr"}) as unknown as TypedDocumentString<BroadcastTplStrFragment, unknown>;
export const BroadcastTplTextFragmentDoc = new TypedDocumentString(`
fragment BroadcastTplText on WhatsAppTemplateComponentText {
  text {
    __typename
    ... on WhatsAppTemplateComponentTextPartText {
      text
    }
    ... on WhatsAppTemplateComponentTextPartParam {
      name
      value {
        ...BroadcastTplStr
      }
    }
  }
}`, {"fragmentName":"BroadcastTplText"}) as unknown as TypedDocumentString<BroadcastTplTextFragment, unknown>;
export const BroadcastFileRefFragmentDoc = new TypedDocumentString(`
fragment BroadcastFileRef on File {
  id
  url
  type
  status
  size
}`, {"fragmentName":"BroadcastFileRef"}) as unknown as TypedDocumentString<BroadcastFileRefFragment, unknown>;
export const BroadcastTplHeaderFragmentDoc = new TypedDocumentString(`
fragment BroadcastTplHeader on WhatsAppTemplateHeader {
  __typename
  ... on WhatsAppTemplateComponentText {
    ...BroadcastTplText
  }
  ... on WhatsAppTemplateComponentImage {
    image {
      ...BroadcastFileRef
    }
  }
  ... on WhatsAppTemplateComponentVideo {
    video {
      ...BroadcastFileRef
    }
  }
  ... on WhatsAppTemplateComponentDocument {
    document {
      ...BroadcastFileRef
    }
    fileName
  }
}`, {"fragmentName":"BroadcastTplHeader"}) as unknown as TypedDocumentString<BroadcastTplHeaderFragment, unknown>;
export const BroadcastTplButtonFragmentDoc = new TypedDocumentString(`
fragment BroadcastTplButton on WhatsAppTemplateButton {
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
          ...BroadcastTplStr
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
      ...BroadcastTplStr
    }
  }
}`, {"fragmentName":"BroadcastTplButton"}) as unknown as TypedDocumentString<BroadcastTplButtonFragment, unknown>;
export const BroadcastCatalogTemplateFragmentDoc = new TypedDocumentString(`
fragment BroadcastCatalogTemplate on WhatsAppTemplate {
  id
  name
  status
  language
  category
  IsSupportedInFlowbuilder
  header {
    ...BroadcastTplHeader
  }
  body {
    ... on WhatsAppTemplateComponentText {
      ...BroadcastTplText
    }
  }
  footer {
    ... on WhatsAppTemplateComponentText {
      ...BroadcastTplText
    }
  }
  buttons {
    ...BroadcastTplButton
  }
}`, {"fragmentName":"BroadcastCatalogTemplate"}) as unknown as TypedDocumentString<BroadcastCatalogTemplateFragment, unknown>;
export const BroadcastElementErrorsFragmentDoc = new TypedDocumentString(`
fragment BroadcastElementErrors on BlockElement {
  errors {
    __typename
    code
    message
    ... on WhatsAppTemplateParamValueRequiredError {
      paramName
    }
    ... on WhatsAppTemplateURLButtonParamValueRequiredError {
      buttonID
      paramName
    }
  }
}`, {"fragmentName":"BroadcastElementErrors"}) as unknown as TypedDocumentString<BroadcastElementErrorsFragment, unknown>;
export const BroadcastSegmentFilterFragmentDoc = new TypedDocumentString(`
fragment BroadcastSegmentFilter on Filter {
  id
  byAttribute {
    attribute {
      ...BroadcastAttrRef
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
}`, {"fragmentName":"BroadcastSegmentFilter"}) as unknown as TypedDocumentString<BroadcastSegmentFilterFragment, unknown>;
export const BroadcastSegmentFragmentDoc = new TypedDocumentString(`
fragment BroadcastSegment on Segment {
  id
  name
  resultOperator
  filters {
    ...BroadcastSegmentFilter
    byInFlightSegment {
      id
      name
      resultOperator
      filters {
        ...BroadcastSegmentFilter
        byInFlightSegment {
          id
          name
          resultOperator
          filters {
            ...BroadcastSegmentFilter
          }
        }
      }
    }
  }
}`, {"fragmentName":"BroadcastSegment"}) as unknown as TypedDocumentString<BroadcastSegmentFragment, unknown>;
export const BroadcastTplConfigHeaderFragmentDoc = new TypedDocumentString(`
fragment BroadcastTplConfigHeader on WhatsAppTemplateComponentHeader {
  __typename
  ... on WhatsAppTemplateComponentText {
    ...BroadcastTplText
  }
  ... on WhatsAppTemplateComponentImage {
    image {
      ...BroadcastFileRef
    }
  }
  ... on WhatsAppTemplateComponentVideo {
    video {
      ...BroadcastFileRef
    }
  }
  ... on WhatsAppTemplateComponentDocument {
    document {
      ...BroadcastFileRef
    }
    fileName
  }
}`, {"fragmentName":"BroadcastTplConfigHeader"}) as unknown as TypedDocumentString<BroadcastTplConfigHeaderFragment, unknown>;
export const BroadcastTemplateConfigFragmentDoc = new TypedDocumentString(`
fragment BroadcastTemplateConfig on WhatsAppTemplateConfig {
  templateID
  name
  status
  header {
    ...BroadcastTplConfigHeader
  }
  body {
    ... on WhatsAppTemplateComponentText {
      ...BroadcastTplText
    }
  }
  footer {
    ... on WhatsAppTemplateComponentText {
      ...BroadcastTplText
    }
  }
  buttons {
    ...BroadcastTplButton
  }
}`, {"fragmentName":"BroadcastTemplateConfig"}) as unknown as TypedDocumentString<BroadcastTemplateConfigFragment, unknown>;
export const BroadcastElementFragmentDoc = new TypedDocumentString(`
fragment BroadcastElement on BlockElement {
  __typename
  id
  ...BroadcastElementErrors
  ... on WhatsAppOneTimeNotificationBlockElement {
    status
    sentToContactsCount
    segment {
      ...BroadcastSegment
    }
    segmentErrors {
      filterID
      code
    }
  }
  ... on WhatsAppScheduledMessageBlockElement {
    status
    firstSendTime
    repeatType
    repeatOnWeekdays
    repeatEveryNDays
    repeatOnCertainDates
    segment {
      ...BroadcastSegment
    }
    segmentErrors {
      filterID
      code
    }
  }
  ... on WhatsAppTemplateBlockElement {
    waitForReplies
    saveContactReply
    whatsAppTemplate {
      ...BroadcastTemplateConfig
    }
  }
}`, {"fragmentName":"BroadcastElement"}) as unknown as TypedDocumentString<BroadcastElementFragment, unknown>;
export const BroadcastBlockFragmentDoc = new TypedDocumentString(`
fragment BroadcastBlock on Block {
  __typename
  id
  name
  ... on WhatsAppOneTimeNotificationBlock {
    isEntryPointEnabled
  }
  ... on WhatsAppScheduledMessageBlock {
    isEntryPointEnabled
  }
  blockElements {
    ...BroadcastElement
  }
}`, {"fragmentName":"BroadcastBlock"}) as unknown as TypedDocumentString<BroadcastBlockFragment, unknown>;
export const BroadcastConnectionFragmentDoc = new TypedDocumentString(`
fragment BroadcastConnection on Connection {
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
}`, {"fragmentName":"BroadcastConnection"}) as unknown as TypedDocumentString<BroadcastConnectionFragment, unknown>;
export const BroadcastFlowFragmentDoc = new TypedDocumentString(`
fragment BroadcastFlow on Flow {
  __typename
  id
  name
  platform
  createdAt
  entryPoints {
    __typename
    id
    isEntryPointEnabled
  }
  blocks {
    ...BroadcastBlock
  }
  connections {
    ...BroadcastConnection
  }
}`, {"fragmentName":"BroadcastFlow"}) as unknown as TypedDocumentString<BroadcastFlowFragment, unknown>;
export const BroadcastFlowsListDocument = new TypedDocumentString(`
query BroadcastFlowsList($botID: BotID!) {
  bot(id: $botID) {
    id
    flowGroups {
      id
      name
      flows {
        ...BroadcastFlow
      }
    }
    flowsWithoutGroup {
      ...BroadcastFlow
    }
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastFlowsListQuery, BroadcastFlowsListQueryVariables>;
export const BroadcastFlowGetDocument = new TypedDocumentString(`
query BroadcastFlowGet($botID: BotID!, $flowID: FlowID!) {
  bot(id: $botID) {
    id
    flow(flowID: $flowID) {
      ...BroadcastFlow
    }
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastFlowGetQuery, BroadcastFlowGetQueryVariables>;
export const BroadcastTemplatesDocument = new TypedDocumentString(`
query BroadcastTemplates($botID: BotID!, $first: Int, $after: WhatsAppTemplateCursor) {
  bot(id: $botID) {
    id
    whatsAppTemplates(first: $first, after: $after) {
      edges {
        node {
          ...BroadcastCatalogTemplate
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastCatalogTemplateFragmentDoc}`) as unknown as TypedDocumentString<BroadcastTemplatesQuery, BroadcastTemplatesQueryVariables>;
export const BroadcastAudienceCountDocument = new TypedDocumentString(`
query BroadcastAudienceCount($botID: BotID!, $segment: SegmentInput) {
  bot(id: $botID) {
    id
    contactsTotalCount(platforms: [whatsapp], segment: $segment)
  }
}`) as unknown as TypedDocumentString<BroadcastAudienceCountQuery, BroadcastAudienceCountQueryVariables>;
export const BroadcastAttributesDocument = new TypedDocumentString(`
query BroadcastAttributes($botID: BotID!, $first: Int, $after: BotAttributeCursor, $inputSubstring: String) {
  bot(id: $botID) {
    id
    botAttributes(
      locale: En
      platforms: [whatsapp]
      attributeTypes: [system, custom]
      filters: []
      orderBy: {orderBy: ContactsCount, direction: Desc}
      first: $first
      after: $after
      inputSubstring: $inputSubstring
    ) {
      edges {
        node {
          botAttribute {
            ...BroadcastAttrRef
          }
          usersCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
${BroadcastAttrRefFragmentDoc}`) as unknown as TypedDocumentString<BroadcastAttributesQuery, BroadcastAttributesQueryVariables>;
export const BroadcastBotDocument = new TypedDocumentString(`
query BroadcastBot($botID: BotID!) {
  bot(id: $botID) {
    id
    timezone
    contactScopes {
      __typename
      id
      ... on WhatsAppPhoneContactScope {
        phone {
          id
          displayPhoneNumber
          status
          whatsAppBusinessAccount {
            id
            name
            facebookBusiness {
              id
              name
            }
          }
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<BroadcastBotQuery, BroadcastBotQueryVariables>;
export const BroadcastCreateFlowDocument = new TypedDocumentString(`
mutation BroadcastCreateFlow($botID: BotID!) {
  createFlow(botID: $botID, platform: whatsapp) {
    id
    flowsWithoutGroup {
      id
      name
    }
  }
}`) as unknown as TypedDocumentString<BroadcastCreateFlowMutation, BroadcastCreateFlowMutationVariables>;
export const BroadcastRenameFlowDocument = new TypedDocumentString(`
mutation BroadcastRenameFlow($flowID: FlowID!, $name: String!) {
  updateFlowName(flowID: $flowID, name: $name) {
    ...BroadcastFlow
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastRenameFlowMutation, BroadcastRenameFlowMutationVariables>;
export const BroadcastDeleteFlowDocument = new TypedDocumentString(`
mutation BroadcastDeleteFlow($flowID: FlowID!) {
  deleteFlow(flowID: $flowID) {
    id
    flowGroups {
      id
      name
      flows {
        id
      }
    }
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<BroadcastDeleteFlowMutation, BroadcastDeleteFlowMutationVariables>;
export const BroadcastCreateGroupDocument = new TypedDocumentString(`
mutation BroadcastCreateGroup($botID: BotID!) {
  createFlowGroup(botID: $botID) {
    id
    flowGroups {
      id
      name
    }
  }
}`) as unknown as TypedDocumentString<BroadcastCreateGroupMutation, BroadcastCreateGroupMutationVariables>;
export const BroadcastRenameGroupDocument = new TypedDocumentString(`
mutation BroadcastRenameGroup($groupID: FlowGroupID!, $name: String!) {
  updateFlowGroupName(id: $groupID, name: $name) {
    id
    name
  }
}`) as unknown as TypedDocumentString<BroadcastRenameGroupMutation, BroadcastRenameGroupMutationVariables>;
export const BroadcastMoveToGroupDocument = new TypedDocumentString(`
mutation BroadcastMoveToGroup($flowID: FlowID!, $groupID: FlowGroupID!) {
  moveFlowToGroup(flowID: $flowID, groupID: $groupID) {
    id
    flowGroups {
      id
      name
      flows {
        id
      }
    }
    flowsWithoutGroup {
      id
    }
  }
}`) as unknown as TypedDocumentString<BroadcastMoveToGroupMutation, BroadcastMoveToGroupMutationVariables>;
export const BroadcastCreateOneTimeDocument = new TypedDocumentString(`
mutation BroadcastCreateOneTime($flowID: FlowID!) {
  whatsAppOneTimeNotificationCreateWithBlockAndWATemplate(
    flowID: $flowID
    positionX: 0
    positionY: 0
  ) {
    ...BroadcastFlow
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastCreateOneTimeMutation, BroadcastCreateOneTimeMutationVariables>;
export const BroadcastCreateScheduledDocument = new TypedDocumentString(`
mutation BroadcastCreateScheduled($flowID: FlowID!) {
  whatsAppScheduledMessageCreateWithBlockAndWATemplate(
    flowID: $flowID
    positionX: 0
    positionY: 0
  ) {
    ...BroadcastFlow
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastCreateScheduledMutation, BroadcastCreateScheduledMutationVariables>;
export const BroadcastDeleteBlockDocument = new TypedDocumentString(`
mutation BroadcastDeleteBlock($flowID: FlowID!, $blockID: BlockID!) {
  deleteBlock(flowID: $flowID, blockID: $blockID) {
    ...BroadcastFlow
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastDeleteBlockMutation, BroadcastDeleteBlockMutationVariables>;
export const BroadcastSetTemplateDocument = new TypedDocumentString(`
mutation BroadcastSetTemplate($elementID: BlockElementID!, $templateID: WhatsAppTemplateID!) {
  whatsAppTemplateSetTemplate(blockElementID: $elementID, templateID: $templateID) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetTemplateMutation, BroadcastSetTemplateMutationVariables>;
export const BroadcastClearTemplateDocument = new TypedDocumentString(`
mutation BroadcastClearTemplate($elementID: BlockElementID!) {
  whatsAppTemplateDeleteTemplate(blockElementID: $elementID) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastClearTemplateMutation, BroadcastClearTemplateMutationVariables>;
export const BroadcastSetHeaderTextDocument = new TypedDocumentString(`
mutation BroadcastSetHeaderText($elementID: BlockElementID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetHeaderTextParamValue(
    blockElementID: $elementID
    name: $name
    value: $value
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetHeaderTextMutation, BroadcastSetHeaderTextMutationVariables>;
export const BroadcastSetBodyTextDocument = new TypedDocumentString(`
mutation BroadcastSetBodyText($elementID: BlockElementID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetBodyTextParamValue(
    blockElementID: $elementID
    name: $name
    value: $value
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetBodyTextMutation, BroadcastSetBodyTextMutationVariables>;
export const BroadcastSetFooterTextDocument = new TypedDocumentString(`
mutation BroadcastSetFooterText($elementID: BlockElementID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetFooterTextParamValue(
    blockElementID: $elementID
    name: $name
    value: $value
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetFooterTextMutation, BroadcastSetFooterTextMutationVariables>;
export const BroadcastSetHeaderImageDocument = new TypedDocumentString(`
mutation BroadcastSetHeaderImage($elementID: BlockElementID!, $fileID: FileID!) {
  whatsAppTemplateSetHeaderImageFile(blockElementID: $elementID, fileID: $fileID) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetHeaderImageMutation, BroadcastSetHeaderImageMutationVariables>;
export const BroadcastSetHeaderVideoDocument = new TypedDocumentString(`
mutation BroadcastSetHeaderVideo($elementID: BlockElementID!, $fileID: FileID!) {
  whatsAppTemplateSetHeaderVideoFile(blockElementID: $elementID, fileID: $fileID) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetHeaderVideoMutation, BroadcastSetHeaderVideoMutationVariables>;
export const BroadcastSetHeaderDocumentDocument = new TypedDocumentString(`
mutation BroadcastSetHeaderDocument($elementID: BlockElementID!, $fileID: FileID!, $fileName: String!) {
  whatsAppTemplateSetHeaderDocumentFile(
    blockElementID: $elementID
    fileID: $fileID
    fileName: $fileName
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetHeaderDocumentMutation, BroadcastSetHeaderDocumentMutationVariables>;
export const BroadcastSetUrlButtonParamDocument = new TypedDocumentString(`
mutation BroadcastSetUrlButtonParam($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $name: WhatsAppTemplateTextParamName!, $value: String!) {
  whatsAppTemplateSetURLButtonTextParamValue(
    blockElementID: $elementID
    buttonID: $buttonID
    name: $name
    value: $value
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetUrlButtonParamMutation, BroadcastSetUrlButtonParamMutationVariables>;
export const BroadcastSetCopyCodeDocument = new TypedDocumentString(`
mutation BroadcastSetCopyCode($elementID: BlockElementID!, $buttonID: ComponentHandleID!, $codeValue: String!) {
  whatsAppTemplateSetCopyCodeButtonCodeValue(
    blockElementID: $elementID
    buttonID: $buttonID
    codeValue: $codeValue
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetCopyCodeMutation, BroadcastSetCopyCodeMutationVariables>;
export const BroadcastSetOneTimeSegmentDocument = new TypedDocumentString(`
mutation BroadcastSetOneTimeSegment($elementID: BlockElementID!, $segment: SegmentInput!) {
  whatsAppOneTimeNotificationUpdateSegment(
    blockElementID: $elementID
    request: $segment
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetOneTimeSegmentMutation, BroadcastSetOneTimeSegmentMutationVariables>;
export const BroadcastSetScheduledSegmentDocument = new TypedDocumentString(`
mutation BroadcastSetScheduledSegment($elementID: BlockElementID!, $segment: SegmentInput!) {
  whatsAppScheduledMessageUpdateSegment(
    blockElementID: $elementID
    request: $segment
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetScheduledSegmentMutation, BroadcastSetScheduledSegmentMutationVariables>;
export const BroadcastSendNowDocument = new TypedDocumentString(`
mutation BroadcastSendNow($elementID: BlockElementID!) {
  whatsAppOneTimeNotificationSend(blockElementID: $elementID) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSendNowMutation, BroadcastSendNowMutationVariables>;
export const BroadcastSetRepeatTypeDocument = new TypedDocumentString(`
mutation BroadcastSetRepeatType($elementID: BlockElementID!, $repeatType: BroadcastRepeatType!) {
  whatsAppScheduledMessageSetRepeatType(
    blockElementID: $elementID
    repeatType: $repeatType
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetRepeatTypeMutation, BroadcastSetRepeatTypeMutationVariables>;
export const BroadcastSetWeekdaysDocument = new TypedDocumentString(`
mutation BroadcastSetWeekdays($elementID: BlockElementID!, $weekdays: [Weekday!]) {
  whatsAppScheduledMessageSetWeekdays(
    blockElementID: $elementID
    weekdays: $weekdays
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetWeekdaysMutation, BroadcastSetWeekdaysMutationVariables>;
export const BroadcastSetEveryNDaysDocument = new TypedDocumentString(`
mutation BroadcastSetEveryNDays($elementID: BlockElementID!, $everyNDays: Int!) {
  whatsAppScheduledMessageSetRepeatEveryNDays(
    blockElementID: $elementID
    everyNDays: $everyNDays
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetEveryNDaysMutation, BroadcastSetEveryNDaysMutationVariables>;
export const BroadcastSetDatesDocument = new TypedDocumentString(`
mutation BroadcastSetDates($elementID: BlockElementID!, $dates: [Time!]!) {
  whatsAppScheduledMessageSetOnCertainDates(
    blockElementID: $elementID
    certainDates: $dates
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetDatesMutation, BroadcastSetDatesMutationVariables>;
export const BroadcastSetFirstSendTimeDocument = new TypedDocumentString(`
mutation BroadcastSetFirstSendTime($elementID: BlockElementID!, $firstSendTime: Time!, $correctedWeekdays: [Weekday!]!) {
  whatsAppScheduledMessageSetFirstSendTime(
    blockElementID: $elementID
    firstSendTime: $firstSendTime
    correctedWeekdays: $correctedWeekdays
  ) {
    ...BroadcastBlock
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}`) as unknown as TypedDocumentString<BroadcastSetFirstSendTimeMutation, BroadcastSetFirstSendTimeMutationVariables>;
export const BroadcastEnableDocument = new TypedDocumentString(`
mutation BroadcastEnable($flowID: FlowID!, $blockID: BlockID!) {
  blockEnableEntryPoint(flowID: $flowID, blockID: $blockID) {
    ...BroadcastFlow
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastEnableMutation, BroadcastEnableMutationVariables>;
export const BroadcastDisableDocument = new TypedDocumentString(`
mutation BroadcastDisable($flowID: FlowID!, $blockID: BlockID!) {
  blockDisableEntryPoint(flowID: $flowID, blockID: $blockID) {
    ...BroadcastFlow
  }
}
${BroadcastFileRefFragmentDoc}
${BroadcastAttrRefFragmentDoc}
${BroadcastTplStrFragmentDoc}
${BroadcastTplTextFragmentDoc}
${BroadcastTplConfigHeaderFragmentDoc}
${BroadcastTplButtonFragmentDoc}
${BroadcastTemplateConfigFragmentDoc}
${BroadcastSegmentFilterFragmentDoc}
${BroadcastSegmentFragmentDoc}
${BroadcastElementErrorsFragmentDoc}
${BroadcastElementFragmentDoc}
${BroadcastBlockFragmentDoc}
${BroadcastConnectionFragmentDoc}
${BroadcastFlowFragmentDoc}`) as unknown as TypedDocumentString<BroadcastDisableMutation, BroadcastDisableMutationVariables>;
export const BroadcastTemplatesRefetchDocument = new TypedDocumentString(`
mutation BroadcastTemplatesRefetch {
  whatsAppEntitiesStartRefetch
}`) as unknown as TypedDocumentString<BroadcastTemplatesRefetchMutation, BroadcastTemplatesRefetchMutationVariables>;