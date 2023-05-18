import { logError } from "../middleware/logging";

export const errorMessages = {
  DOWNLOAD_ERROR: 'Cannot retrieve message from presigned URL',
  EHR_URL_NOT_FOUND_ERROR: 'The presigned URL could not be retrieved',
  SEND_CORE_ERROR: 'Failed while trying to send ehr core',
  SEND_FRAGMENT_ERROR: 'Failed while trying to send message fragment',
  GET_PDS_CODE_ERROR: 'Unable to retrieve patient from PDS',
  PATIENT_RECORD_NOT_FOUND_ERROR: 'Cannot find the requested patient record from ehr-repo',
  STATUS_ERROR: 'The status could not be updated',
  DUPLICATED_REQUEST_ERROR: 'Got a duplicated request',
  FILE_READ_ERROR: 'Failed to read file'
};

export class GetPdsCodeError extends Error {
  constructor(error) {
    super(errorMessages.GET_PDS_CODE_ERROR);
    logError(errorMessages.GET_PDS_CODE_ERROR, error);
  }
}

export class EhrUrlNotFoundError extends Error {
  constructor(error) {
    super(errorMessages.EHR_URL_NOT_FOUND_ERROR);
    logError(errorMessages.EHR_URL_NOT_FOUND_ERROR, error);
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

export class SendFragmentError extends Error {
  constructor(error) {
    super(errorMessages.SEND_FRAGMENT_ERROR);
    logError(errorMessages.SEND_FRAGMENT_ERROR, error);
  };
}

export class PatientRecordNotFoundError extends Error {
  constructor(error) {
    super(errorMessages.PATIENT_RECORD_NOT_FOUND_ERROR);
    logError(errorMessages.PATIENT_RECORD_NOT_FOUND_ERROR, error);
  };
}

export class StatusUpdateError extends Error {
  constructor(error) {
    super(errorMessages.STATUS_ERROR);
    logError(errorMessages.STATUS_ERROR, error);
  }
}

export class DuplicatedRequestError extends Error {
  constructor(error) {
    super(errorMessages.DUPLICATED_REQUEST_ERROR);
    logError(errorMessages.DUPLICATED_REQUEST_ERROR, error);
  }
}

export class FileReadError extends Error {
  constructor(error) {
    super(errorMessages.FILE_READ_ERROR);
    logError(errorMessages.FILE_READ_ERROR, error);
  }
}