import axios from "axios";
import { logError } from "../../middleware/logging";
import { DownloadError, EhrUrlNotFoundError } from "../../errors/errors";

export const downloadFromUrl = async (messageUrl) => {
  return await axios.get(messageUrl)
    .then(response => response.data)
    .catch(error => handleDownloadError(error));
};

const handleDownloadError = (error) => {
  const errorMessage = 'Cannot retrieve message from presigned URL';
  logError(errorMessage, error);
  throw new DownloadError(errorMessage);
};

export const handleGetUrlNotFoundError = (error, messageType) => {
  let errorMessage;

  if (error.response?.status === 404) {
    errorMessage = `Cannot find the ${messageType}`;
    logError(errorMessage, error);
    throw new EhrUrlNotFoundError(errorMessage);
  }

  errorMessage = `Error retrieving the ${messageType}`;
  logError(errorMessage, error);
  throw error;
};