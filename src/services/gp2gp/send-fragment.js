import { logError, logInfo } from "../../middleware/logging";
import { initializeConfig } from "../../config";
import axios from "axios";
import { SendFragmentError } from "../../errors/errors";

export const sendFragment = async (conversationId, odsCode, fragmentMessage, messageId) => {
  const { gp2gpMessengerAuthKeys, gp2gpMessengerServiceUrl } = initializeConfig();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/fragment`;

  const requestBody = { conversationId, odsCode, fragmentMessage, messageId };

  await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } })
    .then(() => logInfo('Successfully sent message fragment'))
    .catch(error => throw new SendFragmentError('Failed while trying to send message fragment', error));
}
