import axios from "axios";
import { logError, logInfo } from "../../middleware/logging";
import { DownloadError, EhrUrlNotFoundError } from "../../errors/errors";
import { getPdsOdsCode } from "../gp2gp/pds-retrieval-request";
import { Status } from "../../models/registration-request";
import { initializeConfig } from "../../config";
import { updateRegistrationRequestStatus } from "../database/registration-request-repository";

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

export const patientAndPracticeOdsCodesMatch = async (nhsNumber, odsCode) => {
  logInfo('Getting patient current ODS code');
  const pdsOdsCode = await getPdsOdsCode(nhsNumber);
  return pdsOdsCode === odsCode;
}