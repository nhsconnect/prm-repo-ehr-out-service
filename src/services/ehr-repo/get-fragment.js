import { logInfo, logError } from "../../middleware/logging";
import { downloadFromUrl } from "../transfer/transfer-out-util";
import { initializeConfig } from "../../config";
import axios from "axios";
import { EhrUrlNotFoundError, PatientRecordNotFoundError } from "../../errors/errors";

export const getFragmentFromRepo = async (nhsNumber, messageId) => {
  logInfo('Getting ehr in conversation ID from EHR repo');
  const conversationIdFromEhrIn = await retrieveConversationIdFromEhrInFromRepo(nhsNumber);

  logInfo('Getting message fragment from EHR repo');
  const fragmentMessageUrl = await retrieveFragmentPresignedUrlFromRepo(conversationIdFromEhrIn, messageId);

  logInfo('Successfully retrieved presigned URL for fragment');
  const fragment = await downloadFromUrl(fragmentMessageUrl);

  logInfo('Successfully retrieved fragment');
  return fragment;
};


const retrieveConversationIdFromEhrInFromRepo = async (nhsNumber) => {
  const config = initializeConfig();

  const repoUrl = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys }
  })
    .then(response => response.data?.conversationIdFromEhrIn)
    .catch(error => {
      if (error?.response?.status === 404){
        throw new PatientRecordNotFoundError(error);
      } else {
        logError('Failed to retrieve conversationIdFromEhrIn from ehr-repo');
        throw error;
      }
    });
};

const retrieveFragmentPresignedUrlFromRepo = async (conversationIdFromEhrIn, messageId) => {
  const config = initializeConfig();

  const repoUrl = `${config.ehrRepoServiceUrl}/messages/${conversationIdFromEhrIn}/${messageId}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys, messageId }
  })
    .then(response => response.data)
    .catch(error => { throw new EhrUrlNotFoundError(error); });
};
