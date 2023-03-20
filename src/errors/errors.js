import { logError } from "../middleware/logging";

export class EhrUrlNotFoundError extends Error {
  constructor(message, error) {
    super(message);
    error ? logError(message, error) : logError(message);
  }
}

export class DownloadError extends Error {
  constructor(message, error) {
    super(message);
    error ? logError(message, error) : logError(message);
  }
}

export class SendFragmentError extends Error {
  constructor(error) {
    const message = 'Failed while trying to send message fragment';
    super(message);

    error ? logError(message, error) : logError(message);
  }
}


export class TransferOutFragmentError extends Error {
  constructor(error) {
    const message = 'Failed while trying to transfer message fragment';
    super(message);

    error ? logError(message, error) : logError(message);
  }
}