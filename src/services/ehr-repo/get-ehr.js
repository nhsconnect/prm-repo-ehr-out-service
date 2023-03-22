import { initializeConfig } from "../../config";
import axios from "axios";
import { logInfo } from "../../middleware/logging";
import { downloadFromUrl } from "../transfer/transfer-out-util";
import { EhrUrlNotFoundError } from "../../errors/errors";

export const getEhrCoreFromRepo = async (nhsNumber, conversationId) => {
  const coreMessageUrl = await retrievePresignedUrlFromRepo(nhsNumber, conversationId);
  logInfo(`Successfully retrieved presigned URL`);
  const ehrCore = await downloadFromUrl(coreMessageUrl);
  logInfo(`Successfully retrieved EHR`);
  return ehrCore;
};

const retrievePresignedUrlFromRepo = async (nhsNumber, conversationId) => {
  const config = initializeConfig();
  const repoUrl = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys, conversationId }
  })
    .then(response => response.data.coreMessageUrl)
    .catch(error => { throw new EhrUrlNotFoundError(error); });
};