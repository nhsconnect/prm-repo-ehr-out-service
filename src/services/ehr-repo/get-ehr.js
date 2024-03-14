import { config } from '../../config';
import axios from 'axios';
import { logInfo, logError } from '../../middleware/logging';
import { downloadFromUrl } from '../transfer/transfer-out-util';
import { PresignedUrlNotFoundError } from '../../errors/errors';

export const getEhrCoreAndFragmentIdsFromRepo = async (nhsNumber, conversationId) => {
  const { coreMessageUrl, fragmentMessageIds, inboundConversationId } = await retrievePresignedUrlFromRepo(
    nhsNumber,
    conversationId
  );
  logInfo(`Successfully retrieved presigned URL`);
  if (fragmentMessageIds.length > 0) {
    logInfo(`Successfully retrieved fragment message ids`);
  }
  const ehrCore = await downloadFromUrl(coreMessageUrl);

  logInfo(`Successfully retrieved EHR core`);

  return { ehrCore, fragmentMessageIds, inboundConversationId };
};

const retrievePresignedUrlFromRepo = (nhsNumber, conversationId) => {
  const { ehrRepoAuthKeys, ehrRepoServiceUrl } = config();
  const repoUrl = `${ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return axios
    .get(repoUrl, {
      headers: { Authorization: ehrRepoAuthKeys, conversationId }
    })
    .then(response => {
      return {
        coreMessageUrl: response.data.coreMessageUrl,
        fragmentMessageIds: response.data.fragmentMessageIds
      };
    })
    .catch(error => {
      if (error?.response?.status === 404) {
        throw new PresignedUrlNotFoundError(error);
      } else {
        logError('Error retrieving health record', error);
        throw error;
      }
    });
};
