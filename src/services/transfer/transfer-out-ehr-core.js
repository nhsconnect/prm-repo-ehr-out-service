import {PresignedUrlNotFoundError, DownloadError, PatientRecordNotFoundError} from '../../errors/errors';
import { logError, logInfo, logWarning } from '../../middleware/logging';
import { getEhrCoreAndFragmentIdsFromRepo } from '../ehr-repo/get-ehr';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { parseMessageId } from '../parser/parsing-utilities';
import { sendCore } from '../gp2gp/send-core';
import {
  createAndStoreOutboundMessageIds,
  getNewMessageIdForOldMessageId,
  patientAndPracticeOdsCodesMatch,
  replaceMessageIdsInObject,
  updateConversationStatus
} from './transfer-out-util';
import {
  createOutboundConversation,
  getOutboundConversationById
} from '../database/dynamodb/outbound-conversation-repository';
import {AcknowledgementErrorCode, ConversationStatus, FailureReason} from '../../constants/enums';
import {sendAcknowledgement} from "../gp2gp/send-acknowledgement";

export async function transferOutEhrCore({
  conversationId: outboundConversationId,
  nhsNumber,
  odsCode,
  ehrRequestId
}) {
  setCurrentSpanAttributes({ conversationId: outboundConversationId });
  logInfo('EHR transfer out request received');

  try {
    if (await isEhrRequestDuplicate(outboundConversationId)) return;
    await createOutboundConversation(outboundConversationId, nhsNumber, odsCode);

    if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
      await updateConversationStatus(
        outboundConversationId,
        ConversationStatus.OUTBOUND_FAILED,
        FailureReason.INCORRECT_ODS_CODE,
        "The patient's ODS Code in PDS does not match the requesting practice's ODS Code."
      );

      return;
    }

    await updateConversationStatus(outboundConversationId, ConversationStatus.OUTBOUND_STARTED);

    logInfo("Retrieving the patient's health record from the EHR Repository.");

    const { ehrCoreWithUpdatedMessageId, newMessageId } = await getEhrCoreAndUpdateMessageIds(
      nhsNumber,
      outboundConversationId
    );

    logInfo('Sending the EHR Core to GP2GP Messenger.');

    await sendCore(
      outboundConversationId,
      odsCode,
      ehrCoreWithUpdatedMessageId,
      ehrRequestId,
      newMessageId
    );
  } catch (error) {
    await handleCoreTransferError(error, outboundConversationId, ehrRequestId);
  }
}

const getEhrCoreAndUpdateMessageIds = async (nhsNumber, conversationId) => {
  const { ehrCore, fragmentMessageIds, inboundConversationId } =
    await getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId);
  const ehrCoreMessageId = await parseMessageId(ehrCore);
  const messageIdReplacements = await createAndStoreOutboundMessageIds(
    [ehrCoreMessageId, ...fragmentMessageIds],
    inboundConversationId
  );

  const ehrCoreWithUpdatedMessageId = replaceMessageIdsInObject(ehrCore, messageIdReplacements);
  const ehrCoreOutboundMessageId = getNewMessageIdForOldMessageId(
    ehrCoreMessageId,
    messageIdReplacements
  );

  return { ehrCoreWithUpdatedMessageId, newMessageId: ehrCoreOutboundMessageId };
};

const isEhrRequestDuplicate = async conversationId => {
  const previousTransferOut = await getOutboundConversationById(conversationId);

  if (previousTransferOut !== null) {
    logWarning(`EHR out transfer with conversation ID ${conversationId} is already in progress`);
    return true;
  }

  return false;
};

const handleCoreTransferError = async (
  error,
  nhsNumber,
  odsCode,
  conversationId,
  ehrRequestId
) => {
  switch (true) {
    // TODO PRMP-534 should a presigned URL not found be handled differently or is it considered an 06 patient not at practice?
    case error instanceof PresignedUrlNotFoundError:
    case error instanceof PatientRecordNotFoundError:

      await sendAcknowledgement(
        nhsNumber,
        odsCode,
        conversationId,
        ehrRequestId,
        AcknowledgementErrorCode.ERROR_CODE_06
      );

      await updateConversationStatus(
        conversationId,
        ConversationStatus.OUTBOUND_FAILED,
        FailureReason.MISSING_FROM_REPO // TODO PRMP-534 Should this be replaced with a more gp2gp-aligned '06' code?
      );
      break;
    case error instanceof DownloadError:
      await updateConversationStatus(
        conversationId,
        ConversationStatus.OUTBOUND_FAILED,
        FailureReason.EHR_DOWNLOAD_FAILED
      );
      break;
    default:
      logError('EHR transfer out request failed', error);
      await updateConversationStatus(
        conversationId,
        ConversationStatus.OUTBOUND_FAILED,
        FailureReason.CORE_SENDING_FAILED
      ).catch(error => {
        logError('Could not update status due to error', error);
      });
  }
};
