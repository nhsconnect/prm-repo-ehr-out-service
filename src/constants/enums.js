export const RecordType = {
  ALL: 'ALL', // Option for querying all layers in one call
  CONVERSATION: 'CONVERSATION',
  CORE: 'CORE',
  FRAGMENT: 'FRAGMENT'
};

export const ConversationStatus = {
  INBOUND_STARTED: 'INBOUND_STARTED',
  INBOUND_REQUEST_SENT: 'INBOUND_REQUEST_SENT',
  INBOUND_CONTINUE_REQUEST_SENT: 'INBOUND_CONTINUE_REQUEST_SENT',
  INBOUND_COMPLETE: 'INBOUND_COMPLETE',
  INBOUND_FAILED: 'INBOUND_FAILED',
  INBOUND_TIMEOUT: 'INBOUND_TIMEOUT',

  OUTBOUND_STARTED: 'OUTBOUND_STARTED',
  OUTBOUND_SENT_EHR_CORE: 'OUTBOUND_SENT_EHR_CORE',
  OUTBOUND_CONTINUE_REQUEST_RECEIVED: 'OUTBOUND_CONTINUE_REQUEST_RECEIVED',
  OUTBOUND_FRAGMENTS_SENDING_FAILED: 'OUTBOUND_FRAGMENTS_SENDING_FAILED',
  OUTBOUND_SENT_FRAGMENTS: 'OUTBOUND_SENT_FRAGMENTS',
  OUTBOUND_COMPLETE: 'OUTBOUND_COMPLETE', // == EHR_INTEGRATED
  OUTBOUND_FAILED: 'OUTBOUND_FAILED',
  OUTBOUND_TIMEOUT: 'OUTBOUND_TIMEOUT'
};

export const CoreStatus = {
  INBOUND_COMPLETE: 'STORED_IN_REPOSITORY',
  OUTBOUND_SENT: 'OUTBOUND_SENT',
  OUTBOUND_COMPLETE: 'OUTBOUND_COMPLETE',
  OUTBOUND_FAILED: 'OUTBOUND_FAILED'
};

export const FragmentStatus = {
  INBOUND_COMPLETE: 'STORED_IN_REPOSITORY',
  OUTBOUND_REQUEST_RECEIVED: 'OUTBOUND_FRAGMENT_REQUEST_RECEIVED',
  OUTBOUND_SENT: 'OUTBOUND_SENT',
  OUTBOUND_COMPLETE: 'OUTBOUND_COMPLETE',
  OUTBOUND_FAILED: 'OUTBOUND_FAILED'
};

export const QueryKeyType = {
  InboundConversationId: 'InboundConversationId',
  NhsNumber: 'NhsNumber',
  OutboundConversationId: 'OutboundConversationId'
};

export const FailureReason = {
  // Conversation / Core level
  INCORRECT_ODS_CODE: 'OUTBOUND:incorrect_ods_code',
  MISSING_FROM_REPO: 'OUTBOUND:missing_from_repo',
  EHR_DOWNLOAD_FAILED: 'OUTBOUND:ehr_download_failed',
  CORE_SENDING_FAILED: 'OUTBOUND:core_sending_failed',
  EHR_INTEGRATION_FAILED: 'OUTBOUND:ehr_integration_failed',

  // Fragment level
  DOWNLOAD_FAILED: 'OUTBOUND:download_failed',
  SENDING_FAILED: 'OUTBOUND:sending_failed'
};

Object.freeze(RecordType);
Object.freeze(ConversationStatus);
Object.freeze(CoreStatus);
Object.freeze(FragmentStatus);
