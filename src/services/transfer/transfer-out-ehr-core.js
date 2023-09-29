import { getRegistrationRequestByConversationId } from '../database/registration-request-repository';
import { logError, logInfo, logWarning } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { createRegistrationRequest } from '../database/create-registration-request';
import { Status } from '../../models/registration-request';
import {EhrUrlNotFoundError, DownloadError, SendCoreError} from '../../errors/errors';
import { getEhrCoreAndFragmentIdsFromRepo } from '../ehr-repo/get-ehr';
import { sendCore } from '../gp2gp/send-core';
import {
  createNewMessageIds, getNewMessageIdForOldMessageId,
  patientAndPracticeOdsCodesMatch, replaceMessageIdsInObject,
  updateConversationStatus,
} from './transfer-out-util';
import {parseMessageId} from "../parser/parsing-utilities";

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
    switch (error) {
      case error instanceof EhrUrlNotFoundError:
        await updateConversationStatus(conversationId, Status.MISSING_FROM_REPO);
        break;
      case error instanceof DownloadError:
        await updateConversationStatus(conversationId, Status.EHR_DOWNLOAD_FAILED);
        break;
      // this will catch SendCoreErrors & Any miscellaneous errors
      default:
        await updateConversationStatus(conversationId, Status.CORE_SENDING_FAILED);
        logError('EHR transfer out request failed', error);
    }
  }
}

const getEhrCoreAndUpdateMessageIds = async (nhsNumber, conversationId) => {
  const { ehrCore, fragmentMessageIds } = await getEhrCoreAndFragmentIdsFromRepo(
    nhsNumber,
    conversationId
  );

  const ehrCoreMessageId = await parseMessageId(ehrCore);
  const allMessageIds = [ehrCoreMessageId].concat(fragmentMessageIds);
  const messageIdReplacements = await createNewMessageIds(allMessageIds);

  // TODO PRMT-4074 REMOVE THIS
  // let { ehrCoreWithUpdatedMessageId, newMessageId } = await updateMessageIdForEhrCore(ehrCore);
  // // logInfo(`Replaced message id for ehrCore`);
  //
  //
  //
  // if (fragmentMessageIds?.length > 0) {
  //   const messageIdReplacements = await createNewMessageIds(fragmentMessageIds);
  //   logInfo(`Replaced fragment id references in ehrCore`);
  // }

  const ehrCoreWithUpdatedMessageId = await replaceMessageIdsInObject(ehrCore, messageIdReplacements);

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
