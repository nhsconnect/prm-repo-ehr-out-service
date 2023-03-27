import axios from "axios";
import { logInfo } from "../../middleware/logging";
import { config } from "../../config";
import { SendFragmentError } from "../../errors/errors";

export const sendFragment = async (conversationId, odsCode, fragmentMessage, messageId) => {
  const { gp2gpMessengerAuthKeys, gp2gpMessengerServiceUrl } = config();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/fragment`;

  const requestBody = { conversationId, odsCode, fragmentMessage, messageId };

  await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } })
    .then(() => logInfo('Successfully sent message fragment'))
    .catch(error => {
      throw new SendFragmentError(error)
    });
}
