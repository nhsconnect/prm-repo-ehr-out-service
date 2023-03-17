import { logInfo } from "../../middleware/logging";
import { downloadFromUrl, handleGetUrlNotFoundError } from "../transfer/transfer-out-util";
import { initializeConfig } from "../../config";
import axios from "axios";

export const getFragmentFromRepo = async (nhsNumber, messageId) => {
  const fragmentMessageUrl = await retrievePresignedUrlFromRepo(nhsNumber, messageId);
  logInfo('Successfully retrieved presigned URL for fragment');
  const fragment = await downloadFromUrl(fragmentMessageUrl);
  logInfo('Successfully retrieved fragment');
  return fragment;
};

const retrievePresignedUrlFromRepo = async (conversationId, messageId) => {
  const config = initializeConfig();
  const repoUrl = `${config.ehrRepoServiceUrl}/messages/${conversationId}/${messageId}`;

  return await axios.get(repoUrl, {
    headers: { Authorization: config.ehrRepoAuthKeys, messageId }
  })
    .then(response => response.data.coreMessageUrl) // TODO [PRMT-2728] what is 'core'? Do we need to rewrite this?
    .catch(error => handleGetUrlNotFoundError(error, 'message fragment'));
};