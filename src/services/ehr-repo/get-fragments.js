import { logInfo, logError } from "../../middleware/logging";
import { downloadFromUrl } from "../transfer/transfer-out-util";
import { config } from "../../config";
import axios from "axios";
import { EhrUrlNotFoundError, PatientRecordNotFoundError } from "../../errors/errors";

export const getAllFragmentsWithMessageIdsFromRepo = async (nhsNumber) => {
  logInfo('Getting ehrIn conversation ID and message ID from EHR repo');
  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);

  logInfo('Getting message fragments from EHR repo');

  const allFragments = await Promise.all(
    messageIds.map(messageId => getFragment(conversationIdFromEhrIn, messageId))
  );

  const allFragmentsWithMessageIds = {};
  messageIds.forEach((messageId, index) => {
    allFragmentsWithMessageIds[messageId] = allFragments[index]
  })

  logInfo('Successfully retrieved all fragments');
  return allFragmentsWithMessageIds;
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

const getFragment = async (conversationIdFromEhrIn, messageId) => {
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
  }).then(response => response.data)
    .catch(error => { throw new EhrUrlNotFoundError(error) });
};
