import { PresignedUrlNotFoundError, PatientRecordNotFoundError } from "../../errors/errors";
import { downloadFromUrl } from "../transfer/transfer-out-util";
import { logInfo, logError } from "../../middleware/logging";
import { config } from "../../config";
import axios from "axios";

export const getMessageIdsFromEhrRepo = async (nhsNumber) => {
  const { ehrRepoServiceUrl, ehrRepoAuthKeys } = config();
  const repoUrl = `${ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: ehrRepoAuthKeys }
  })
    .then(extractIdsFromEhrRepoResponse)
    .catch(handleErrorWhileRetrievingIds);
};

const extractIdsFromEhrRepoResponse = response => {
  return {
    conversationIdFromEhrIn: response.data?.conversationIdFromEhrIn,
    messageIds: response.data?.fragmentMessageIds
  };
};

const handleErrorWhileRetrievingIds = error => {
  if (error?.response?.status === 404) {
    throw new PatientRecordNotFoundError(error);
  } else {
    logError('Failed to retrieve conversationIdFromEhrIn from ehr-repo');
    throw error;
  }
};

export const getFragment = async (conversationIdFromEhrIn, messageId) => {
  const fragmentMessageUrl = await retrieveFragmentPresignedUrlFromRepo(conversationIdFromEhrIn, messageId);
  logInfo(`Successfully retrieved fragment presigned url with messageId: ${messageId}`);
  const fragment = await downloadFromUrl(fragmentMessageUrl);
  logInfo(`Successfully retrieved fragment with messageId: ${messageId}`);

  return fragment;
};

const retrieveFragmentPresignedUrlFromRepo = async (conversationIdFromEhrIn, messageId) => {
  const { ehrRepoServiceUrl, ehrRepoAuthKeys } = config();
  const repoUrl = `${ehrRepoServiceUrl}/fragments/${conversationIdFromEhrIn}/${messageId}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: ehrRepoAuthKeys}
  }).then(response => response.data )
    .catch(error => { throw new PresignedUrlNotFoundError(error) });
};