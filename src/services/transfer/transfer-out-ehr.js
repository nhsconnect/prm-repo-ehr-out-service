import { config } from '../../config';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../database/registration-request-repository';
import { logError, logInfo } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { createRegistrationRequest } from '../database/create-registration-request';
import { getPatientHealthRecordFromRepo } from '../ehr-repo/get-health-record';
import { Status } from '../../models/registration-request';
import { getPdsOdsCode } from '../gp2gp/pds-retrieval-request';
import { sendEhrExtract } from '../gp2gp/send-ehr-extract';

// TODO [PRMT-2728] DEPRECATED - remove this & any associated test class
export async function transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId }) {
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
    const patientHealthRecord = await getPatientHealthRecordFromRepo(nhsNumber, conversationId);
    if (!patientHealthRecord) {
      logs = `Patient does not have a complete health record in repo`;
      await updateStatus(conversationId, Status.MISSING_FROM_REPO, logs);
      return defaultResult;
    }

    logInfo('Getting patient current ODS code');
    const pdsOdsCode = await getPdsOdsCode(nhsNumber);
    if (pdsOdsCode !== odsCode) {
      logs = 'Patients ODS Code in PDS does not match requesting practices ODS Code';
      await updateStatus(conversationId, Status.INCORRECT_ODS_CODE, logs);
      return defaultResult;
    }

    await updateRegistrationRequestStatus(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);

    logInfo('Sending EHR extract');
    await sendEhrExtract(conversationId, odsCode, ehrRequestId, patientHealthRecord.coreMessageUrl);

    logInfo('Updating status');
    await updateStatus(conversationId, Status.SENT_EHR, logs);
    return defaultResult;
  } catch (err) {
    logError('EHR transfer out request failed', err);
    return {
      hasFailed: true,
      error: err.message
    };
  }
}

const updateStatus = async (conversationId, status, logs) => {
  config();
  await updateRegistrationRequestStatus(conversationId, status);
  logInfo(logs);
};
