import { initializeConfig } from '../../config';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../database/registration-request-repository';
import { logError, logInfo } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { createRegistrationRequest } from '../database/create-registration-request';
import { Status } from '../../models/registration-request';
import { EhrUrlNotFoundError, DownloadError } from "../../errors/errors";
import { getEhrCoreFromRepo } from "../ehr-repo/get-ehr";
import { sendCore } from "../gp2gp/send-core";
import { patientAndPracticeOdsCodesMatch } from "./transfer-out-util";

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
    const ehrCore = await getEhrCoreFromRepo(nhsNumber, conversationId);

    if (await patientAndPracticeOdsCodesMatch(nhsNumber, odsCode)) {
      logs = 'Patients ODS Code in PDS does not match requesting practices ODS Code';
      await updateStatus(conversationId, Status.INCORRECT_ODS_CODE, logs);
      return defaultResult;
    }

    await updateRegistrationRequestStatus(conversationId, Status.VALIDATION_CHECKS_PASSED);

    logInfo('Sending EHR core');
    await sendCore(conversationId, odsCode, ehrCore, ehrRequestId);

    logInfo('Updating status');
    await updateStatus(conversationId, Status.SENT_EHR, logs);
    return defaultResult;
  } catch (err) {
    if (err instanceof EhrUrlNotFoundError) {
      await updateStatus(conversationId, Status.MISSING_FROM_REPO);
      return defaultResult;
    }
    if (err instanceof DownloadError) {
      await updateStatus(conversationId, Status.EHR_DOWNLOAD_FAILED);
      return defaultResult;
    }
    logError('EHR transfer out request failed', err);
    return {
      hasFailed: true,
      error: err.message
    };
  }
}

const updateStatus = async (conversationId, status, logs) => {
  initializeConfig();
  await updateRegistrationRequestStatus(conversationId, status);

  if (logs) {
    logInfo(logs);
  }
};
