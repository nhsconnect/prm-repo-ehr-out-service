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
  OUTBOUND_COMPLETE: 'OUTBOUND_COMPLETE',
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

Object.freeze(RecordType);
Object.freeze(ConversationStatus);
Object.freeze(CoreStatus);
Object.freeze(FragmentStatus);
