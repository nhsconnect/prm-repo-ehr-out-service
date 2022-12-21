import { body } from 'express-validator';
import { createRegistrationRequest } from '../../services/database/create-registration-request';
import { logError, logInfo } from '../../middleware/logging';
import { initializeConfig } from '../../config';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { getPdsOdsCode } from '../../services/gp2gp/pds-retrieval-request';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../../services/database/registration-request-repository';
import { Status } from '../../models/registration-request';
import { getPatientHealthRecordFromRepo } from '../../services/ehr-repo/get-health-record';
import { sendEhrExtract } from '../../services/gp2gp/send-ehr-extract';

export const registrationRequestValidationRules = [
  body('data.type').equals('registration-requests'),
  body('data.id').isUUID().withMessage("'conversationId' provided is not of type UUID"),
  body('data.attributes.nhsNumber').isNumeric().withMessage("'nhsNumber' provided is not numeric"),
  body('data.attributes.nhsNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage("'nhsNumber' provided is not 10 characters"),
  body('data.attributes.odsCode').notEmpty(),
  body('data.attributes.ehrRequestId')
    .isUUID()
    .withMessage("'ehrRequestId' provided is not of type UUID")
];

async function processEhrRequest(conversationId, res, nhsNumber, odsCode, ehrRequestId) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('EHR request received');

  let logs = 'EHR has been successfully sent';

  const notRespondedYet = {
    responded: false
  };
  const responded = {
    responded: true
  };

  try {
    const previousRegistration = await getRegistrationRequestStatusByConversationId(conversationId);
    if (previousRegistration !== null) {
      res.status(409).json({
        error: `Registration request with this ConversationId is already in progress`
      });
      logInfo(`Duplicate registration request`);
      return responded;
    }

    await createRegistrationRequest(conversationId, nhsNumber, odsCode);

    logInfo('Getting patient health record from EHR repo');
    const patientHealthRecord = await getPatientHealthRecordFromRepo(nhsNumber);
    if (!patientHealthRecord) {
      logs = `Patient does not have a complete health record in repo`;
      await updateStatus(conversationId, Status.MISSING_FROM_REPO, logs);
      return notRespondedYet;
    }

    logInfo('Getting patient current ODS code');
    const pdsOdsCode = await getPdsOdsCode(nhsNumber);
    if (pdsOdsCode !== odsCode) {
      logs = 'Patients ODS Code in PDS does not match requesting practices ODS Code';
      await updateStatus(conversationId, Status.INCORRECT_ODS_CODE, logs);
      return notRespondedYet;
    }

    await updateRegistrationRequestStatus(conversationId, Status.VALIDATION_CHECKS_PASSED);

    logInfo('Sending EHR extract');
    await sendEhrExtract(
      conversationId,
      odsCode,
      ehrRequestId,
      patientHealthRecord.coreEhrMessageUrl
    );

    logInfo('Updating status');
    await updateStatus(conversationId, Status.SENT_EHR, logs);
    return notRespondedYet;
  } catch (err) {
    logError('Registration request failed', err);
    res.status(503).json({
      errors: err.message
    });
    return responded;
  }
}

export const registrationRequest = async (req, res) => {
  logInfo('Create registration request received');

  const { id: conversationId, attributes } = req.body.data;
  const { nhsNumber, odsCode, ehrRequestId } = attributes;
  const ehrRequestResult = await processEhrRequest(
    conversationId,
    res,
    nhsNumber,
    odsCode,
    ehrRequestId
  );
  if (ehrRequestResult.responded === false) {
    await sendResponse(res, conversationId);
  }
};

const updateStatus = async (conversationId, status, logs) => {
  initializeConfig();
  await updateRegistrationRequestStatus(conversationId, status);
  logInfo(logs);
};

const sendResponse = async (res, conversationId, status, logs) => {
  const config = initializeConfig();
  const statusEndpoint = `${config.repoToGpServiceUrl}/registration-requests/${conversationId}`;
  res.set('Location', statusEndpoint).sendStatus(204);
};
