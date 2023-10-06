import { getRegistrationRequestByConversationId } from '../database/registration-request-repository';
import { createRegistrationRequest } from '../database/create-registration-request';
import { PresignedUrlNotFoundError, DownloadError } from '../../errors/errors';
import { logError, logInfo, logWarning } from '../../middleware/logging';
import { getEhrCoreAndFragmentIdsFromRepo } from '../ehr-repo/get-ehr';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { parseMessageId } from "../parser/parsing-utilities";
import { Status } from '../../models/registration-request';
import { sendCore } from '../gp2gp/send-core';
import {
  createNewMessageIds, getNewMessageIdForOldMessageId,
  patientAndPracticeOdsCodesMatch, replaceMessageIdsInObject,
  updateConversationStatus,
} from './transfer-out-util';

export async function transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('EHR transfer out request received');

  try {
    if (await isEhrRequestDuplicate(conversationId)) return;
    await createRegistrationRequest(conversationId, messageId, nhsNumber, odsCode);

    if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
      await updateConversationStatus(
        conversationId,
        Status.INCORRECT_ODS_CODE,
        'Patients ODS Code in PDS does not match requesting practices ODS Code'
      );

      return;
    }

    await updateConversationStatus(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);

    logInfo('Getting patient health record from EHR repo');

    const { ehrCoreWithUpdatedMessageId, newMessageId } = await getEhrCoreAndUpdateMessageIds(
      nhsNumber,
      conversationId
    );

    logInfo('EHR transfer out started');
    logInfo('Sending EHR core');

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
      'EHR has been successfully sent'
    );
  } catch (error) {
    await handleCoreTransferError(error, conversationId);
  }
}

const getEhrCoreAndUpdateMessageIds = async (nhsNumber, conversationId) => {
  const { ehrCore, fragmentMessageIds } = await getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId);
  const ehrCoreMessageId = await parseMessageId(ehrCore);
  const messageIdReplacements = await createNewMessageIds([ehrCoreMessageId, ...fragmentMessageIds]);
  const ehrCoreWithUpdatedMessageId = replaceMessageIdsInObject(ehrCore, messageIdReplacements);
  const newMessageId = getNewMessageIdForOldMessageId(ehrCoreMessageId, messageIdReplacements);

  return { ehrCoreWithUpdatedMessageId, newMessageId };
};

const isEhrRequestDuplicate = async conversationId => {
  const previousTransferOut = await getRegistrationRequestByConversationId(conversationId);

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
}