import axios from 'axios';
import { logInfo } from '../../middleware/logging';
import { config } from '../../config';
import { SendCoreError } from "../../errors/errors";
import { logOutboundMessage } from "./logging-utils";
import { updateConversationStatus } from "../transfer/transfer-out-util";
import { ConversationStatus } from "../../constants/enums";

export const sendCore = async (conversationId, odsCode, coreEhr, ehrRequestId, newMessageId) => {
  const { gp2gpMessengerServiceUrl, gp2gpMessengerAuthKeys } = config();
  const url = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/core`;

  const requestBody = { conversationId, odsCode, coreEhr, ehrRequestId, messageId: newMessageId };

  logInfo('POST request to gp2gp /ehr-out-transfers/core with request body as below:');
  logOutboundMessage(requestBody);

  await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } })
    .then(async () => {
      await updateConversationStatus(
          conversationId,
          ConversationStatus.OUTBOUND_SENT_CORE,
          null,
          `The EHR Core with Outbound Conversation ID ${conversationId} has successfully been sent.`
      );
    })
    .catch(error => {
      throw new SendCoreError(error);
    });
}
