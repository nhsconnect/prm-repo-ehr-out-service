import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../transfer/transfer-out-util";
import { transferOutFragments } from "../transfer/transfer-out-fragments";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { Status } from "../../models/registration-request";
import { logInfo } from "../../middleware/logging";

export default async function continueMessageHandler(parsedMessage) {
  // Set logging attributes.
  const { conversationId, nhsNumber, odsCode } = parsedMessage;
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle continue request');

  if (!await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode)) {
    await updateConversationStatus(
      conversationId,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code');
    return;
  }

  await updateConversationStatus(conversationId, Status.CONTINUE_REQUEST_RECEIVED);

  await transferOutFragments({conversationId, nhsNumber, odsCode})
    .then(async () => await updateConversationStatus(
        conversationId,
        Status.SENT_FRAGMENTS,
        'Fragments have successfully been transferred'))
    .catch(async () => await updateConversationStatus(
        conversationId,
        Status.FRAGMENTS_SENDING_FAILED,
        'One or more fragments failed to send'));
}