export class EhrUrlNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "EhrUrlNotFoundError";
  }
}

export class EhrDownloadError extends Error {
  constructor(message) {
    super(message);
    this.name = "EhrDownloadError";
  }
}

