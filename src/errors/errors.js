export class EhrUrlNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "EhrUrlNotFoundError";
  }
}

export class DownloadError extends Error {
  constructor(message) {
    super(message);
    this.name = "EhrDownloadError";
  }
}

