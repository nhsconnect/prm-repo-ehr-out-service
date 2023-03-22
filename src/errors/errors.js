import { logError } from "../middleware/logging";

export const errorMessages = {
  DOWNLOAD_ERROR: 'Cannot retrieve message from presigned URL',
  EHR_URL_NOT_FOUND_ERROR: 'The presigned URL could not be retrieved',
  SEND_FRAGMENT_ERROR: 'Failed while trying to send message fragment',
  TRANSFER_OUT_FRAGMENT_ERROR: 'Failed while trying to transfer message fragment',
  GET_PDS_CODE_ERROR: 'Unable to retrieve patient from PDS'
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

export class SendFragmentError extends Error {
  constructor(error) {
    super(errorMessages.SEND_FRAGMENT_ERROR);
    logError(errorMessages.SEND_FRAGMENT_ERROR, error);
  };
}

export class TransferOutFragmentError extends Error {
  constructor(error) {
    super(errorMessages.TRANSFER_OUT_FRAGMENT_ERROR);
    logError(errorMessages.TRANSFER_OUT_FRAGMENT_ERROR, error);
  };
}