import {
  patientAndPracticeOdsCodesMatch,
  updateConversationStatus, updateCoreStatus
} from '../transfer/transfer-out-util';
import {
  getNhsNumberByOutboundConversationId,
  getOutboundConversationById
} from '../database/dynamodb/outbound-conversation-repository';
import { parseContinueRequestMessage } from '../parser/continue-request-parser';
import {
  transferOutFragmentsForNewContinueRequest,
  transferOutFragmentsForRetriedContinueRequest
} from '../transfer/transfer-out-fragments';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { parseConversationId } from '../parser/parsing-utilities';
import { logError, logInfo, logWarning } from '../../middleware/logging';
import {AcknowledgementErrorCode, ConversationStatus, CoreStatus, FailureReason} from '../../constants/enums';
import { hasServiceStartedInTheLast5Minutes } from '../../config';
import {sendAcknowledgement} from "../gp2gp/send-acknowledgement";
import {DownloadError, PatientRecordNotFoundError, PresignedUrlNotFoundError} from "../../errors/errors";

export default async function continueMessageHandler(message) {
  const conversationId = await parseConversationId(message);
  const continueRequestMessage = await parseContinueRequestMessage(message);
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle continue request');

  const conversation = await getOutboundConversationById(conversationId);

  if (!conversation) {
    logError(
      'Received a continue request for an unknown conversationId. Will not proceed further.'
    );
  }

  switch (conversation?.TransferStatus) {
    case ConversationStatus.OUTBOUND_SENT_FRAGMENTS:
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
  const { odsCode, messageId } = continueRequestMessage;
  const nhsNumber = await getNhsNumberByOutboundConversationId(conversationId);

  logInfo('Found NHS number for the given conversation ID');

  if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
    await updateConversationStatus(
      conversationId,
      ConversationStatus.OUTBOUND_FAILED,
      FailureReason.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code'
    );
    return;
  }

  await updateConversationStatus(conversationId, ConversationStatus.OUTBOUND_CONTINUE_REQUEST_RECEIVED);
  await updateCoreStatus(conversationId, CoreStatus.OUTBOUND_COMPLETE);

  await transferOutFragmentsForNewContinueRequest({
    conversationId,
    nhsNumber,
    odsCode
  })
    .then(() => {
      logInfo('Finished transferOutFragment');
      updateConversationStatus(conversationId, ConversationStatus.OUTBOUND_SENT_FRAGMENTS);
    })
    .catch(async error =>
      await handleFragmentTransferError(
        error,
        nhsNumber,
        odsCode,
        conversationId,
        messageId
      )
    );
};

const handleRetriedContinueRequest = async (conversationId, continueRequestMessage) => {
  logInfo(`Resuming failed continue request for conversation ID ${conversationId}`);

  const { odsCode, messageId } = continueRequestMessage;
  const nhsNumber = await getNhsNumberByOutboundConversationId(conversationId);

  logInfo('Found NHS number for the given conversation ID');

  if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
    // TODO PRMP-534 Maybe move this into handleFragmentTransferError
    await updateConversationStatus(
      conversationId,
      ConversationStatus.OUTBOUND_FAILED,
      FailureReason.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code'
    );
    return;
  }

  transferOutFragmentsForRetriedContinueRequest({
    conversationId,
    nhsNumber,
    odsCode
  })
    .then(() => {
      logInfo('Finished transferOutFragment');
      updateConversationStatus(conversationId, ConversationStatus.OUTBOUND_SENT_FRAGMENTS);
    })
    .catch(async error =>
      await handleFragmentTransferError(
        error,
        nhsNumber,
        odsCode,
        conversationId,
        messageId
      )
    );
};

const handleFragmentTransferError = async (
  error,
  nhsNumber,
  odsCode,
  conversationId,
  messageId
) => {
  logError('Encountered error while sending out fragments', error);

  let failureReason;

  switch (true) {
    case error instanceof PatientRecordNotFoundError:
      /*
      // TODO PMRP-534
          How would this happen, realistically? At this point the core must have been transferred out successfully
          so we must have ingested something?
       */
      failureReason = AcknowledgementErrorCode.ERROR_CODE_06.errorCode
      await sendAcknowledgement(nhsNumber, odsCode, conversationId, messageId, AcknowledgementErrorCode.ERROR_CODE_06);
      break;
  }

  await updateConversationStatus(
    conversationId,
    ConversationStatus.OUTBOUND_FRAGMENTS_SENDING_FAILED,
    failureReason,
    'A fragment failed to send, aborting transfer'
  );
};
