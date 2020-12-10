import { body } from 'express-validator';
import { createRegistrationRequest } from '../../services/database/create-registration-request';
import { logError, logEvent } from '../../middleware/logging';
import { initializeConfig } from '../../config';
import { getPdsOdsCode } from '../../services/gp2gp/pds-retrieval-request';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../../services/database/registration-request-repository';
import { Status } from '../../models/registration-request';
import { getPatientHealthRecordFromRepo } from '../../services/ehr-repo/get-health-record';

export const registrationRequestValidationRules = [
  body('data.type').equals('registration-requests'),
  body('data.id').isUUID().withMessage("'conversationId' provided is not of type UUID"),
  body('data.attributes.nhsNumber').isNumeric().withMessage("'nhsNumber' provided is not numeric"),
  body('data.attributes.nhsNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage("'nhsNumber' provided is not 10 characters"),
  body('data.attributes.odsCode').notEmpty()
];

export const registrationRequest = async (req, res) => {
  const { id: conversationId, attributes } = req.body.data;
  const { nhsNumber, odsCode } = attributes;
  let logs = `Validation checks passed`;

  try {
    const previousRegistration = await getRegistrationRequestStatusByConversationId(conversationId);
    if (previousRegistration !== null) {
      res.status(409).json({
        error: `Registration request with this ConversationId is already in progress`
      });
      logEvent(`Duplicate registration request`, { nhsNumber, conversationId });
      return;
    }

    await createRegistrationRequest(conversationId, nhsNumber, odsCode);

    const patientHealthRecordIsInRepo = await getPatientHealthRecordFromRepo(nhsNumber);
    if (!patientHealthRecordIsInRepo) {
      logs = `Patient does not have a complete health record in repo`;
      await updateStatusAndSendResponse(
        res,
        conversationId,
        Status.MISSING_FROM_REPO,
        logs,
        nhsNumber
      );
      return;
    }

    const pdsOdsCode = await getPdsOdsCode(nhsNumber);
    if (pdsOdsCode !== odsCode) {
      logs = 'Patients ODS Code in PDS does not match requesting practices ODS Code';
      await updateStatusAndSendResponse(
        res,
        conversationId,
        Status.INCORRECT_ODS_CODE,
        logs,
        nhsNumber
      );
      return;
    }

    await updateStatusAndSendResponse(
      res,
      conversationId,
      Status.VALIDATION_CHECKS_PASSED,
      logs,
      nhsNumber
    );
  } catch (err) {
    logError('Registration request failed', err);
    res.status(503).json({
      errors: err.message
    });
  }
};

const updateStatusAndSendResponse = async (res, conversationId, status, logs, nhsNumber) => {
  const config = initializeConfig();
  const statusEndpoint = `${config.repoToGpServiceUrl}/registration-requests/${conversationId}`;

  await updateRegistrationRequestStatus(conversationId, status);
  logEvent(logs, { nhsNumber, conversationId });
  res.set('Location', statusEndpoint).sendStatus(204);
};
