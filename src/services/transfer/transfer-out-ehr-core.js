import { getRegistrationRequestStatusByConversationId } from '../database/registration-request-repository';
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
  logInfo('EHR transfer out request received');

  try {
    // Stop transfer if it is a duplicated EHR request
    if (await isEhrRequestDuplicate(conversationId)) {
      return;
    }

    await createRegistrationRequest(conversationId, messageId, nhsNumber, odsCode);

    // Stop transfer if ODS codes don't match
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
    // TODO: Here we should update the message id of this Registration Request in database to newMessageId.
    // To be addressed in another ticket

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
}

const isEhrRequestDuplicate = async (conversationId) => {
  const previousTransferOut  = await getRegistrationRequestStatusByConversationId(conversationId);
  if (previousTransferOut !== null) {
    logInfo('Duplicate transfer out request');
    logInfo('EHR out transfer with this conversation ID is already in progress');
    return true;
  }
  return false;
}