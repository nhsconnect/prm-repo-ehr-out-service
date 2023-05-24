import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../transfer/transfer-out-util";
import { transferOutFragments } from "../transfer/transfer-out-fragments";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { Status } from "../../models/registration-request";
import { logError, logInfo } from "../../middleware/logging";
import { getNhsNumberByConversationId } from "../database/registration-request-repository";

export default async function continueMessageHandler(parsedMessage) {
  // Set logging attributes.
  const { conversationId, odsCode } = parsedMessage;
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle continue request');

  const nhsNumber = await getNhsNumberByConversationId(conversationId);

  logInfo('Found NHS number for the given conversation ID');

  if (!await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode)) {
    await updateConversationStatus(
      conversationId,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code');
    return;
  }

  await updateConversationStatus(conversationId, Status.CONTINUE_REQUEST_RECEIVED);

  await transferOutFragments({conversationId, nhsNumber, odsCode})
    .then(() => {
      logInfo("Finished transferOutFragment");
      updateConversationStatus(conversationId, Status.SENT_FRAGMENTS)
    })
    .catch(error => {
      logError("Encountered error while sending out fragments", error);

      updateConversationStatus(
        conversationId,
        Status.FRAGMENTS_SENDING_FAILED,
        'One or more fragments failed to send');
    })
}