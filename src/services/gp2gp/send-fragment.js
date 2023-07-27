import axios from "axios";
import { logInfo } from "../../middleware/logging";
import { config } from "../../config";
import { SendFragmentError } from "../../errors/errors";
import { logOutboundMessage } from "./logging-utils";

export const sendFragment = async (conversationId, odsCode, fragmentMessage, messageId) => {
  const { gp2gpMessengerAuthKeys, gp2gpMessengerServiceUrl } = config();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/fragment`;

  const requestBody = { conversationId, odsCode, fragmentMessage, messageId };

  logInfo('POST request to gp2gp /ehr-out-transfers/fragment with request body as below:');
  logOutboundMessage(requestBody);

  await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } })
    .then(() => logInfo('Successfully sent message fragment'))
    .catch(error => {
      throw new SendFragmentError(error);
    });
}
