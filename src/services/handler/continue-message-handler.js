import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../transfer/transfer-out-util";
import { getNhsNumberByConversationId } from "../database/registration-request-repository";
import { parseContinueRequestMessage } from "../parser/continue-request-parser";
import { transferOutFragments } from "../transfer/transfer-out-fragments";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { parseConversationId } from "../parser/parsing-utilities";
import { logError, logInfo } from "../../middleware/logging";
import { Status } from "../../models/registration-request";

export default async function continueMessageHandler(message) {
  const conversationId = await parseConversationId(message);
  const continueRequestMessage = await parseContinueRequestMessage(message);
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle continue request');

  const nhsNumber = await getNhsNumberByConversationId(conversationId);

  logInfo('Found NHS number for the given conversation ID');

  if (!await patientAndPracticeOdsCodesMatch(nhsNumber, continueRequestMessage.odsCode)) {
    await updateConversationStatus(
      conversationId,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code');
    return;
  }

  await updateConversationStatus(conversationId, Status.CONTINUE_REQUEST_RECEIVED);

  await transferOutFragments({
    conversationId,
    nhsNumber,
    odsCode: continueRequestMessage.odsCode
  })
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
    });
};