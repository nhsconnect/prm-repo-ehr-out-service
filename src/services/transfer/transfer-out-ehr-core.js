import { PresignedUrlNotFoundError, DownloadError } from '../../errors/errors';
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
import { ConversationStatus, FailureReason } from '../../constants/enums';

export async function transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('EHR transfer out request received');

  try {
    if (await isEhrRequestDuplicate(conversationId)) return;
    await createOutboundConversation(conversationId, nhsNumber, odsCode);

    if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
      await updateConversationStatus(
        conversationId,
        ConversationStatus.OUTBOUND_FAILED,
        FailureReason.INCORRECT_ODS_CODE,
        "The patient's ODS Code in PDS does not match the requesting practice's ODS Code."
      );

      return;
    }

    await updateConversationStatus(conversationId, ConversationStatus.OUTBOUND_STARTED);

    logInfo("Retrieving the patient's health record from the EHR Repository.");

    const { ehrCoreWithUpdatedMessageId, newMessageId } = await getEhrCoreAndUpdateMessageIds(
      nhsNumber,
      conversationId
    );

    logInfo('Sending the EHR Core to GP2GP Messenger.');

    await sendCore(
      conversationId,
      odsCode,
      ehrCoreWithUpdatedMessageId,
      ehrRequestId,
      newMessageId
    );
  } catch (error) {
    await handleCoreTransferError(error, conversationId);
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

const handleCoreTransferError = async (error, conversationId) => {
  switch (true) {
    case error instanceof PresignedUrlNotFoundError:
      await updateConversationStatus(
        conversationId,
        ConversationStatus.OUTBOUND_FAILED,
        FailureReason.MISSING_FROM_REPO
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
