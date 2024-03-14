import {
  patientAndPracticeOdsCodesMatch,
  updateConversationStatus
} from '../transfer/transfer-out-util';
// import {
//   getNhsNumberByOutboundConversationId,
//   getOutboundConversationById
// } from "../database/registration-request-repository";
import { parseContinueRequestMessage } from '../parser/continue-request-parser';
import {
  transferOutFragmentsForNewContinueRequest,
  transferOutFragmentsForRetriedContinueRequest
} from '../transfer/transfer-out-fragments';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { parseConversationId } from '../parser/parsing-utilities';
import { logError, logInfo, logWarning } from '../../middleware/logging';
// import { Status } from "../../models/registration-request";
import { hasServiceStartedInTheLast5Minutes } from '../../config';
import {
  getNhsNumberByOutboundConversationId,
  getOutboundConversationById
} from '../database/dynamodb/outbound-conversation-repository';
import { ConversationStatus } from '../../constants/enums';

export default async function continueMessageHandler(message) {
  const conversationId = await parseConversationId(message);
  const continueRequestMessage = await parseContinueRequestMessage(message);
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle continue request');

  const conversation = await getOutboundConversationById(conversationId);

  switch (conversation?.TransferStatus) {
    case ConversationStatus.OUTBOUND_SENT_ALL_MESSAGES:
    case ConversationStatus.OUTBOUND_COMPLETE:
      logWarning(
        `Ignoring duplicate continue request. Conversation ID ${conversationId} already completed successfully`
      );
      break;

    case ConversationStatus.OUTBOUND_FAILED:
      logWarning(
        `Ignoring duplicate continue request. Conversation ID ${conversationId} already failed and is unable to retry`
      );
      break;

    case ConversationStatus.OUTBOUND_CONTINUE_REQUEST_RECEIVED:
      hasServiceStartedInTheLast5Minutes()
        ? await handleRetriedContinueRequest(conversationId, continueRequestMessage)
        : logWarning(
            `Fragment transfer with conversation ID ${conversationId} is already in progress`
          );
      break;

    case ConversationStatus.OUTBOUND_FRAGMENTS_SENDING_FAILED:
      await handleRetriedContinueRequest(conversationId, continueRequestMessage);
      break;

    default:
      await handleNewContinueRequest(conversationId, continueRequestMessage);
      break;
  }
}

const handleNewContinueRequest = async (conversationId, continueRequestMessage) => {
  const nhsNumber = await getNhsNumberByOutboundConversationId(conversationId);

  logInfo('Found NHS number for the given conversation ID');

  if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, continueRequestMessage.odsCode))) {
    await updateConversationStatus(
      conversationId,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code'
    );
    return;
  }

  await updateConversationStatus(conversationId, Status.CONTINUE_REQUEST_RECEIVED);

  await transferOutFragmentsForNewContinueRequest({
    conversationId,
    nhsNumber,
    odsCode: continueRequestMessage.odsCode
  })
    .then(() => {
      logInfo('Finished transferOutFragment');
      updateConversationStatus(conversationId, Status.SENT_FRAGMENTS);
    })
    .catch(error => {
      logError('Encountered error while sending out fragments', error);
      updateConversationStatus(
        conversationId,
        Status.FRAGMENTS_SENDING_FAILED,
        'A fragment failed to send, aborting transfer'
      );
    });
};

const handleRetriedContinueRequest = async (conversationId, continueRequestMessage) => {
  logInfo(`Resuming failed continue request for conversation ID ${conversationId}`);

  const nhsNumber = await getNhsNumberByOutboundConversationId(conversationId);

  logInfo('Found NHS number for the given conversation ID');

  if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, continueRequestMessage.odsCode))) {
    await updateConversationStatus(
      conversationId,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code'
    );
    return;
  }

  transferOutFragmentsForRetriedContinueRequest({
    conversationId,
    nhsNumber,
    odsCode: continueRequestMessage.odsCode
  })
    .then(() => {
      logInfo('Finished transferOutFragment');
      updateConversationStatus(conversationId, Status.SENT_FRAGMENTS);
    })
    .catch(error => {
      logError('Encountered error while sending out fragments', error);
      updateConversationStatus(
        conversationId,
        Status.FRAGMENTS_SENDING_FAILED,
        'A fragment failed to send, aborting transfer'
      );
    });
};
