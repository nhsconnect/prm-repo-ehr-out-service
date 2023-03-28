import axios from 'axios';
import { logInfo, logError } from '../../middleware/logging';
import { config } from '../../config';
import { SendCoreError } from "../../errors/errors";

export const sendCore = async (conversationId, odsCode, coreEhr, ehrRequestId) => {
  const { gp2gpMessengerServiceUrl, gp2gpMessengerAuthKeys } = config();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/core`;

  const requestBody = { conversationId, odsCode, coreEhr, ehrRequestId };

  try {
    await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } });
    logInfo('Successfully sent ehr');
  } catch (err) {
    logError('Failed while trying to send ehr', err);
    throw err;
  }
};
