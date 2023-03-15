import { initializeConfig } from "../../config";
import axios from "axios";
import { logError, logInfo } from "../../middleware/logging";
import { EhrUrlNotFoundError, EhrDownloadError } from "../../errors/errors";

export const getEhrCoreFromRepo = async (nhsNumber, conversationId) => {
  const coreMessageUrl = await retrievePresignedUrlFromRepo(nhsNumber, conversationId);
  logInfo(`Successfully retrieved presigned URL`);
  const ehrCore = await downloadEhrFromUrl(coreMessageUrl);
  logInfo(`Successfully retrieved EHR`);
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

const downloadEhrFromUrl = async (messageUrl) => {
  return await axios.get(messageUrl)
    .then(response => response.data)
    .catch(error => handleDownloadError(error));
};

const handleGetUrlError = (error) => {
  let errorMessage;

  if (error.response?.status === 404) {
    errorMessage = 'Cannot find complete patient health record';
    logError(errorMessage, error);
    throw new EhrUrlNotFoundError(errorMessage);
  }

  errorMessage = 'Error retrieving health record';
  logError(errorMessage, error);
  throw error;
};

const handleDownloadError = (error) => {
  const errorMessage = 'Cannot retrieve EHR from presigned URL';
  logError(errorMessage, error);
  throw new EhrDownloadError(errorMessage);
};