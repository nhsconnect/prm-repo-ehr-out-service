import axios from 'axios';
import { logInfo, logError } from '../../middleware/logging';
import { config } from '../../config';
import { SendCoreError } from "../../errors/errors";

export const sendCore = async (conversationId, odsCode, coreEhr, ehrRequestId) => {
  const { gp2gpMessengerServiceUrl, gp2gpMessengerAuthKeys } = config();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/core`;

  const requestBody = { conversationId, odsCode, coreEhr, ehrRequestId };

  await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } })
    .then(() => logInfo('Successfully sent ehr core'))
    .catch(error => {
      throw new SendCoreError(error);
    });
}
