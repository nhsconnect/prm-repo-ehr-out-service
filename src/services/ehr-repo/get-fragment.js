import { logInfo } from "../../middleware/logging";
import { downloadFromUrl } from "../transfer/transfer-out-util";
import { initializeConfig } from "../../config";
import axios from "axios";
import { EhrUrlNotFoundError } from "../../errors/errors";

export const getFragmentFromRepo = async (nhsNumber, messageId) => {

  logInfo('Getting ehr in conversation ID from EHR repo');
  const ehrInConversationId = await retrieveEhrInConversationIdFromRepo(nhsNumber);

  logInfo('Getting message fragment from EHR repo');
  const fragmentMessageUrl = await retrieveFragmentPresignedUrlFromRepo(ehrInConversationId, messageId);

  logInfo('Successfully retrieved presigned URL for fragment');
  const fragment = await downloadFromUrl(fragmentMessageUrl);

  logInfo('Successfully retrieved fragment');
  return fragment;
};


const retrieveEhrInConversationIdFromRepo = async (nhsNumber) => {
  const config = initializeConfig();
  const repoUrl = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys }
  })
    .then(response => response?.data?.conversationIdFromEhrIn)
    .catch(error => { throw error });
};

const retrieveFragmentPresignedUrlFromRepo = async (ehrInConversationId, messageId) => {
  const config = initializeConfig();
  const repoUrl = `${config.ehrRepoServiceUrl}/messages/${ehrInConversationId}/${messageId}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys, messageId }
  })
    .then(response => response.data)
    .catch(error => { throw new EhrUrlNotFoundError(error); });
};
