import axios from 'axios';
import { logInfo, logError } from '../../middleware/logging';
import { config } from '../../config';
import { SendCoreError } from "../../errors/errors";
import { logOutboundMessage } from "./logging-utils";

export const sendCore = async (conversationId, odsCode, coreEhr, ehrRequestId, newMessageId) => {
  const { gp2gpMessengerServiceUrl, gp2gpMessengerAuthKeys } = config();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/core`;

  const requestBody = { conversationId, odsCode, coreEhr, ehrRequestId, messageId: newMessageId };

  logInfo('POST request to gp2gp /ehr-out-transfers/core with request body as below:');
  logOutboundMessage(requestBody);

  await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } })
    .then(() => logInfo('Successfully sent ehr core'))
    .catch(error => {
      throw new SendCoreError(error);
    });
}
