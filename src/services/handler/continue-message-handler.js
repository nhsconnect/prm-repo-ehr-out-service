import { setCurrentSpanAttributes } from "../../config/tracing";
import { logInfo } from "../../middleware/logging";
import { transferOutFragments } from "../transfer/transfer-out-fragments";
import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../transfer/transfer-out-util";
import { Status } from "../../models/registration-request";
import { config } from "../../config";
import { updateRegistrationRequestStatus } from "../database/registration-request-repository";

export default async function continueMessageHandler(parsedMessage) {
  // Set logging attributes.
  const { conversationId, nhsNumber, odsCode } = parsedMessage;
  setCurrentSpanAttributes({ conversationId: conversationId });

  logInfo('Trying to handle continue request');

  if (await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode)) {
    await updateConversationStatus(conversationId, Status.INCORRECT_ODS_CODE);
    logInfo('Conversation has already started');
    return;
  }

  await updateConversationStatus(conversationId, Status.CONTINUE_REQUEST_RECEIVED);

  await Promise.all(async () => await transferOutFragments(conversationId, nhsNumber))
    .then(async () => await updateConversationStatus(
        conversationId,
        Status.SENT_FRAGMENTS))
    .catch(async () => await updateConversationStatus(
        conversationId,
        Status.FRAGMENTS_SENDING_FAILED,
        'One or more fragments failed to send'));
}