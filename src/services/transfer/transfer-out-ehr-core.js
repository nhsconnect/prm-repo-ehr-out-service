import { PresignedUrlNotFoundError, DownloadError } from '../../errors/errors';
import { logError, logInfo, logWarning } from '../../middleware/logging';
import { getEhrCoreAndFragmentIdsFromRepo } from '../ehr-repo/get-ehr';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { parseMessageId } from '../parser/parsing-utilities';
import { Status } from '../../models/registration-request';
import { sendCore } from '../gp2gp/send-core';
import {
  createNewMessageIds,
  getNewMessageIdForOldMessageId,
  patientAndPracticeOdsCodesMatch,
  replaceMessageIdsInObject,
  updateConversationStatus
} from './transfer-out-util';
import {
  createOutboundConversation,
  getOutboundConversationById
} from '../database/dynamodb/outbound-conversation-repository';

export async function transferOutEhrCore({
  conversationId,
  nhsNumber,
  messageId,
  odsCode,
  ehrRequestId
}) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('EHR transfer out request received');

  try {
    if (await isEhrRequestDuplicate(conversationId)) return;
    await createOutboundConversation(conversationId, messageId, nhsNumber, odsCode);

    if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
      await updateConversationStatus(
        conversationId,
        Status.INCORRECT_ODS_CODE,
        "The patient's ODS Code in PDS does not match the requesting practice's ODS Code."
      );

      return;
    }

    await updateConversationStatus(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);

    logInfo("Retrieving the patient's health record from the EHR Repository.");

    const { ehrCoreWithUpdatedMessageId, newMessageId } = await getEhrCoreAndUpdateMessageIds(
      nhsNumber,
      conversationId
    );

    // await updateRegistrationRequestMessageId(messageId, newMessageId);

    logInfo('Sending the EHR Core to GP2GP Messenger.');

    await sendCore(
      conversationId,
      odsCode,
      ehrCoreWithUpdatedMessageId,
      ehrRequestId,
      newMessageId
    );

    await updateConversationStatus(
      conversationId,
      Status.SENT_EHR,
      'The EHR Core has successfully been sent.'
    );
  } catch (error) {
    await handleCoreTransferError(error, conversationId);
  }
}

const getEhrCoreAndUpdateMessageIds = async (nhsNumber, conversationId) => {
  const { ehrCore, fragmentMessageIds } = await getEhrCoreAndFragmentIdsFromRepo(
    nhsNumber,
    conversationId
  );
  const ehrCoreMessageId = await parseMessageId(ehrCore);
  const messageIdReplacements = await createNewMessageIds([
    ehrCoreMessageId,
    ...fragmentMessageIds
  ]);
  const ehrCoreWithUpdatedMessageId = replaceMessageIdsInObject(ehrCore, messageIdReplacements);
  const newMessageId = getNewMessageIdForOldMessageId(ehrCoreMessageId, messageIdReplacements);

  return { ehrCoreWithUpdatedMessageId, newMessageId };
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
      await updateConversationStatus(conversationId, Status.MISSING_FROM_REPO);
      break;
    case error instanceof DownloadError:
      await updateConversationStatus(conversationId, Status.EHR_DOWNLOAD_FAILED);
      break;
    default:
      await updateConversationStatus(conversationId, Status.CORE_SENDING_FAILED);
      logError('EHR transfer out request failed', error);
  }
};
