import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../transfer/transfer-out-util";
import {
  getNhsNumberByConversationId,
  getRegistrationRequestByConversationId
} from "../database/registration-request-repository";
import { parseContinueRequestMessage } from "../parser/continue-request-parser";
import {
  transferOutFragmentsForNewContinueRequest,
  transferOutFragmentsForRetriedContinueRequest
} from "../transfer/transfer-out-fragments";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { parseConversationId } from "../parser/parsing-utilities";
import { logError, logInfo, logWarning } from "../../middleware/logging";
import { Status } from "../../models/registration-request";
import { hasServiceStartedInTheLast5Minutes } from "../../config";
import {getMessageIdsFromEhrRepo} from "../ehr-repo/get-fragment";

export default async function continueMessageHandler(message) {
  const conversationId = await parseConversationId(message);
  const continueRequestMessage = await parseContinueRequestMessage(message);
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle continue request');

  const registrationRequest = await getRegistrationRequestByConversationId(conversationId);

  switch (registrationRequest.status) {
    case Status.SENT_FRAGMENTS:
    case Status.EHR_INTEGRATED:
      logWarning(`Ignoring duplicate continue request. Conversation ID ${conversationId} already completed successfully`);
      break;

    case Status.INCORRECT_ODS_CODE:
    case Status.MISSING_FROM_REPO:
    case Status.CORE_SENDING_FAILED:
    case Status.EHR_INTEGRATION_FAILED:
      logWarning(`Ignoring duplicate continue request. Conversation ID ${conversationId} already failed and is unable to retry`);
      break;

    case (Status.CONTINUE_REQUEST_RECEIVED && !hasServiceStartedInTheLast5Minutes):
      logWarning(`Fragment transfer with conversation ID ${conversationId} is already in progress`);
      break;

    case (Status.CONTINUE_REQUEST_RECEIVED && hasServiceStartedInTheLast5Minutes):
    case Status.EHR_DOWNLOAD_FAILED:
    case Status.FRAGMENTS_SENDING_FAILED:
      await handleRetriedContinueRequest(conversationId, continueRequestMessage);
      break;

    default:
      await handleNewContinueRequest(conversationId, continueRequestMessage);
      break;
  }
};

const handleNewContinueRequest = async (conversationId, continueRequestMessage) => {
  /*
    IN THIS METHOD
    - getNhsNumberByConversationId
    - check patient and practice ODS codes match
    - updateConversationStatus to 'CONTINUE_REQUEST_RECEIVED'
   */


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

  await transferOutFragmentsForNewContinueRequest({
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
}

const handleRetriedContinueRequest = async (conversationId, continueRequestMessage) => {
  /*
     IN THIS METHOD
     - getNhsNumberByConversationId
     - check patient and practice ODS codes match
    */

  logInfo(`Resuming failed continue request for conversation ID ${conversationId}`);
  transferOutFragmentsForRetriedContinueRequest();
}
