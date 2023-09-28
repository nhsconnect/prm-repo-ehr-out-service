import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestMessageId
} from '../database/registration-request-repository';
import { logError, logInfo } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { createRegistrationRequest } from '../database/create-registration-request';
import { Status } from '../../models/registration-request';
import { EhrUrlNotFoundError, DownloadError } from '../../errors/errors';
import { getEhrCoreAndFragmentIdsFromRepo } from '../ehr-repo/get-ehr';
import { sendCore } from '../gp2gp/send-core';
import {
  createNewMessageIdsForAllFragments,
  patientAndPracticeOdsCodesMatch,
  updateConversationStatus,
  updateMessageIdForEhrCore,
  updateReferencedFragmentIds
} from './transfer-out-util';

export async function transferOutEhrCore({
  conversationId,
  nhsNumber,
  messageId,
  odsCode,
  ehrRequestId
}) {
  setCurrentSpanAttributes({ conversationId: conversationId });
  logInfo(`EHR Request received, transfer out process initiated for Outbound CID ${conversationId}.`);

  try {
    if (await isEhrRequestDuplicate(conversationId)) return;
    await createRegistrationRequest(conversationId, messageId, nhsNumber, odsCode);

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

    await updateRegistrationRequestMessageId(messageId, newMessageId);

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
    if (error instanceof EhrUrlNotFoundError) {
      await updateConversationStatus(conversationId, Status.MISSING_FROM_REPO);
    }
    if (error instanceof DownloadError) {
      await updateConversationStatus(conversationId, Status.EHR_DOWNLOAD_FAILED);
    }
    logError('EHR transfer out request failed', error);
  }
}

const getEhrCoreAndUpdateMessageIds = async (nhsNumber, conversationId) => {
  const { ehrCore, fragmentMessageIds } = await getEhrCoreAndFragmentIdsFromRepo(
    nhsNumber,
    conversationId
  );

  let { ehrCoreWithUpdatedMessageId, newMessageId } = await updateMessageIdForEhrCore(ehrCore);
  logInfo(`Replaced message id for ehrCore`);

  if (fragmentMessageIds?.length > 0) {
    await createNewMessageIdsForAllFragments(fragmentMessageIds);
    logInfo(`Created new message id for all fragments`);
    ehrCoreWithUpdatedMessageId = await updateReferencedFragmentIds(ehrCoreWithUpdatedMessageId);
    logInfo(`Replaced fragment id references in ehrCore`);
  }
  return { ehrCoreWithUpdatedMessageId, newMessageId };
};

const isEhrRequestDuplicate = async conversationId => {
  const previousTransferOut = await getRegistrationRequestStatusByConversationId(conversationId);
  if (previousTransferOut !== null) {
    logInfo(`EHR out transfer with conversation ID ${conversationId} is already in progress`);
    return true;
  }
  return false;
};
