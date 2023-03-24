import { logInfo, logError } from "../../middleware/logging";
import { downloadFromUrl } from "../transfer/transfer-out-util";
import { config } from "../../config";
import axios from "axios";
import { EhrUrlNotFoundError, PatientRecordNotFoundError } from "../../errors/errors";
import { setCurrentSpanAttributes } from "../../config/tracing";

export const getFragmentsFromRepo = async (nhsNumber) => {
  // setCurrentSpanAttributes({ conversationIdFromEhrIn })
  logInfo('Getting ehr in conversation ID and message from EHR repo');
  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);

  logInfo('Getting message fragments from EHR repo');
  const allFragments = await Promise.all(messageIds.map(messageId => {
    getFragmentFromRepo(conversationIdFromEhrIn, messageIds)))
  })
    .catch(error => {
      // TODO: refactor
      logError(error);
      throw error;
    });

  logInfo('Successfully retrieved fragment');
  return allFragments;
};


const retrieveIdsFromEhrRepo = async (nhsNumber) => {
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

const getFragmentFromRepo = async (conversationIdFromEhrIn, messageId) => {
  const fragmentMessageUrl = await retrieveFragmentPresignedUrlFromRepo(conversationIdFromEhrIn, messageId);

  const fragment = await downloadFromUrl(fragmentMessageUrl);
  logInfo(`Successfully retrieved fragment with messageId: ${messageId}`);
  return fragment;
};

const retrieveFragmentPresignedUrlFromRepo = async (conversationIdFromEhrIn, messageId) => {
  const { ehrRepoServiceUrl, ehrRepoAuthKeys } = config();
  const repoUrl = `${ehrRepoServiceUrl}/messages/${conversationIdFromEhrIn}/${messageId}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: ehrRepoAuthKeys, messageId }
  }).then(response => response.data)
    .catch(error => { throw new EhrUrlNotFoundError(error) });
};