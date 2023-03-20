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
  constructor(message, error) {
    super(message);
    error ? logError(message, error) : logError(message);
  }
}