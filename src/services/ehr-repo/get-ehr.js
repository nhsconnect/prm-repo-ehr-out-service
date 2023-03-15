import { initializeConfig } from "../../config";
import axios from "axios";
import { logError, logInfo } from "../../middleware/logging";

export const getEhrCoreFromRepo = async (nhsNumber, conversationId, description) => {
  const coreMessageUrl = await retrievePresignedUrlFromRepo(nhsNumber, conversationId);
  logInfo(`Successfully retrieved presigned URL for ${description}`);
  const ehrCore = await downloadEhrFromUrl(coreMessageUrl, description);
  logInfo(`Successfully retrieved ehr for ${description}`);
  return ehrCore;
};

const retrievePresignedUrlFromRepo = async (nhsNumber, conversationId) => {
  const config = initializeConfig();
  const repoUrl = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys, conversationId: conversationId }
  })
    .then(response => response.data.coreMessageUrl)
    .catch(error => handleGetUrlError(error));
};

const downloadEhrFromUrl = async (messageUrl, description) => {
  return await axios.get(messageUrl)
    .then(response => response.data)
    .catch(error => handleDownloadError(error, description));
};

const handleGetUrlError = (error) => {
  const errorMessage = error.response?.status === 404
    ? 'Cannot find complete patient health record'
    : 'Error retrieving health record';
  logError(errorMessage, error);
  throw error;
};

const handleDownloadError = (error, description) => {
  logError(`Cannot retrieve ${description}`, error);
  throw error;
};