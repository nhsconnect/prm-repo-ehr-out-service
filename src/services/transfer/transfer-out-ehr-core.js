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

export async function transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId }) {
  setCurrentSpanAttributes({ conversationId: conversationId });
  logInfo('EHR transfer out request received');

  let logs = 'EHR has been successfully sent';

  const defaultResult = {
    hasFailed: false,
    inProgress: false
  };

  try {
    const previousTransferOut = await getRegistrationRequestStatusByConversationId(conversationId);
    if (previousTransferOut !== null) {
      logInfo(`Duplicate transfer out request`);
      return {
        inProgress: true
      };
    }
    await createRegistrationRequest(conversationId, nhsNumber, odsCode);

    logInfo('Getting patient health record from EHR repo');
    const { ehrCore, fragmentMessageIds } = await getEhrCoreAndFragmentIdsFromRepo(
      nhsNumber,
      conversationId
    );

    if (!(await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode))) {
      logs = 'Patients ODS Code in PDS does not match requesting practices ODS Code';
      await updateConversationStatus(conversationId, Status.INCORRECT_ODS_CODE, logs);
      return defaultResult;
    }

    await updateConversationStatus(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);

    let { ehrCoreWithUpdatedMessageId, newMessageId } = await updateMessageIdForEhrCore(ehrCore);
    logInfo(`Successfully replaced message id for ehrCore`);

    if (fragmentMessageIds?.length > 0) {
      await createNewMessageIdsForAllFragments(fragmentMessageIds);
      logInfo(`Successfully created new message id for all fragments`);
      ehrCoreWithUpdatedMessageId = await updateReferencedFragmentIds(ehrCoreWithUpdatedMessageId);
      logInfo(`Successfully replaced fragment id reference in ehrCore`);
    }

    logInfo('Sending EHR core');
    await sendCore(conversationId, odsCode, ehrCoreWithUpdatedMessageId, ehrRequestId, newMessageId);

    await updateConversationStatus(conversationId, Status.SENT_EHR, logs);
    return defaultResult;
  } catch (err) {
    if (err instanceof EhrUrlNotFoundError) {
      await updateConversationStatus(conversationId, Status.MISSING_FROM_REPO);
      return defaultResult;
    }
    if (err instanceof DownloadError) {
      await updateConversationStatus(conversationId, Status.EHR_DOWNLOAD_FAILED);
      return defaultResult;
    }
    logError('EHR transfer out request failed', err);
    return {
      hasFailed: true,
      error: err.message
    };
  }
}
