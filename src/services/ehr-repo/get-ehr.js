import { config } from "../../config";
import axios from "axios";
import { logInfo, logError } from "../../middleware/logging";
import { downloadFromUrl, updateMessageIdForEhrCore } from "../transfer/transfer-out-util";
import { EhrUrlNotFoundError } from "../../errors/errors";

export const getEhrCoreFromRepo = async (nhsNumber, conversationId) => {
  const coreMessageUrl = await retrievePresignedUrlFromRepo(nhsNumber, conversationId);
  logInfo(`Successfully retrieved presigned URL`);
  const ehrCore = await downloadFromUrl(coreMessageUrl);
  logInfo(`Successfully retrieved EHR`);
  const ehrCoreWithUpdatedMessageId = await updateMessageIdForEhrCore(ehrCore);
  logInfo(`Successfully replaced message id`);
  return ehrCoreWithUpdatedMessageId
};

const retrievePresignedUrlFromRepo = async (nhsNumber, conversationId) => {
  const { ehrRepoAuthKeys, ehrRepoServiceUrl } = config();
  const repoUrl = `${ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: ehrRepoAuthKeys, conversationId }
  })
    .then(response => response.data.coreMessageUrl)
    .catch(error => {
      if (error?.response?.status === 404) {
        throw new EhrUrlNotFoundError(error);
      } else {
        logError('Error retrieving health record', error);
        throw error;
      }
    });
};