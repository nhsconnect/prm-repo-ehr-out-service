import { logError } from '../middleware/logging';

export const errorMessages = {
  DOWNLOAD_ERROR: 'Cannot retrieve message from presigned URL',
  PRESIGNED_URL_NOT_FOUND_ERROR: 'The presigned URL could not be retrieved',
  SEND_CORE_ERROR: 'Failed while trying to send ehr core',
  SEND_FRAGMENT_ERROR: 'Failed while trying to send message fragment with message ID: ',
  GET_PDS_CODE_ERROR: 'Unable to retrieve patient from PDS',
  PATIENT_RECORD_NOT_FOUND_ERROR: 'Cannot find the requested patient record from ehr-repo',
  NHS_NUMBER_NOT_FOUND_ERROR: 'Cannot find an NHS number related to given conversation ID',
  STATUS_ERROR: 'The status could not be updated',
  FILE_READ_ERROR: 'Failed to read file',
  DUPLICATED_REQUEST_ERROR: 'Got a duplicated request',
  PARSING_ERROR: 'Unable to parse XML',
  MESSAGE_ID_UPDATE_ERROR: 'Failed while trying to store outbound message ids in database',
  MESSAGE_ID_RECORD_CREATION_ERROR: 'Failed to record the message id replacements in database',
  FRAGMENT_MESSAGE_RECORD_NOT_FOUND_ERROR:
    'Cannot find the fragment message record within the database',
  ACKNOWLEDGEMENT_RECORD_NOT_FOUND_ERROR:
    'Cannot find an acknowledgement record within the database',
  FRAGMENT_MESSAGE_ID_REPLACEMENT_RECORD_NOT_FOUND_ERROR:
    'Cannot find one or more newMessageId for message fragment within the database',
  OUTBOUND_CONVERSATION_NOT_FOUND_ERROR: 'Cannot find the outbound conversation in record',
  OUTBOUND_CONVERSATION_RESET_ERROR: 'Failed to clear the previous record of outbound ehr transfer',
  VALIDATION_ERROR: 'Validation error, details: '
};

export class ParsingError extends Error {
  constructor(error) {
    super(errorMessages.PARSING_ERROR);
    logError(errorMessages.PARSING_ERROR, error);
  };
}

export class GetPdsCodeError extends Error {
  constructor(error) {
    super(errorMessages.GET_PDS_CODE_ERROR);
    logError(errorMessages.GET_PDS_CODE_ERROR, error);
  };
}

export class PresignedUrlNotFoundError extends Error {
  constructor(error) {
    super(errorMessages.PRESIGNED_URL_NOT_FOUND_ERROR);
    logError(errorMessages.PRESIGNED_URL_NOT_FOUND_ERROR, error);
  };
}

export class DownloadError extends Error {
  constructor(error) {
    super(errorMessages.DOWNLOAD_ERROR);
    logError(errorMessages.DOWNLOAD_ERROR, error);
  };
}

export class SendCoreError extends Error {
  constructor(error) {
    super(errorMessages.SEND_CORE_ERROR);
    logError(errorMessages.SEND_CORE_ERROR, error);
  };
}

export class FragmentSendingError extends Error {
  constructor(error, messageId) {
    super(errorMessages.SEND_FRAGMENT_ERROR + messageId);
    logError(errorMessages.SEND_FRAGMENT_ERROR + messageId, error);
  };
}

export class PatientRecordNotFoundError extends Error {
  constructor(error) {
    super(errorMessages.PATIENT_RECORD_NOT_FOUND_ERROR);
    logError(errorMessages.PATIENT_RECORD_NOT_FOUND_ERROR, error);
  };
}

export class NhsNumberNotFoundError extends Error {
  constructor() {
    super(errorMessages.NHS_NUMBER_NOT_FOUND_ERROR);
    logError(errorMessages.NHS_NUMBER_NOT_FOUND_ERROR);
  };
}

export class StatusUpdateError extends Error {
  constructor(error) {
    super(errorMessages.STATUS_ERROR);
    logError(errorMessages.STATUS_ERROR, error);
  };
}

export class MessageIdUpdateError extends Error {
  constructor(error) {
    super(errorMessages.MESSAGE_ID_UPDATE_ERROR);
    logError(errorMessages.MESSAGE_ID_UPDATE_ERROR, error);
  };
}

export class FragmentMessageRecordNotFoundError extends Error {
  constructor(messageIds) {
    super(errorMessages.FRAGMENT_MESSAGE_RECORD_NOT_FOUND_ERROR);
    logError(`${errorMessages.FRAGMENT_MESSAGE_RECORD_NOT_FOUND_ERROR}, related messageId(s): ${messageIds}`);
  };
}

export class AcknowledgementRecordNotFoundError extends Error {
  constructor(messageId) {
    super(`${errorMessages.ACKNOWLEDGEMENT_RECORD_NOT_FOUND_ERROR} with message id ${messageId}`);
    logError(`${errorMessages.ACKNOWLEDGEMENT_RECORD_NOT_FOUND_ERROR} with message id ${messageId}`);
  };
}

export class FileReadError extends Error {
  constructor(error) {
    super(errorMessages.FILE_READ_ERROR);
    logError(errorMessages.FILE_READ_ERROR, error);
  };
}

export class FragmentMessageIdReplacementRecordNotFoundError extends Error {
  constructor(numberOfOldMessageIds, numberOfMessageIdReplacements) {
    super(errorMessages.FRAGMENT_MESSAGE_ID_REPLACEMENT_RECORD_NOT_FOUND_ERROR);
    logError(
      errorMessages.FRAGMENT_MESSAGE_ID_REPLACEMENT_RECORD_NOT_FOUND_ERROR +
      ` expected ${numberOfOldMessageIds} message ID replacements but found ${numberOfMessageIdReplacements}`);
  };
}

export class OutboundConversationNotFoundError extends Error {
  constructor(error) {
    super(errorMessages.OUTBOUND_CONVERSATION_NOT_FOUND_ERROR);
    logError(errorMessages.OUTBOUND_CONVERSATION_NOT_FOUND_ERROR, error);
  };
}

export class OutboundConversationResetError extends Error {
  constructor(error) {
    super(errorMessages.OUTBOUND_CONVERSATION_RESET_ERROR);
    logError(errorMessages.OUTBOUND_CONVERSATION_RESET_ERROR, error);
  };
}

export class ValidationError extends Error {
  constructor(details) {
    const fullErrorMessage = errorMessages.VALIDATION_ERROR + details.join(', ');
    super(fullErrorMessage);
    logError(fullErrorMessage);
  };
}