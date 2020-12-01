import { body } from 'express-validator';
import { createRegistrationRequest } from '../../services/database/create-registration-request';
import { logError } from '../../middleware/logging';
import { initializeConfig } from '../../config';

export const registrationRequestValidationRules = [
  body('data.type').equals('registration-requests'),
  body('data.id').isUUID('4').withMessage("'conversationId' provided is not of type UUIDv4"),
  body('data.attributes.nhsNumber').isNumeric().withMessage("'nhsNumber' provided is not numeric"),
  body('data.attributes.nhsNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage("'nhsNumber' provided is not 10 characters"),
  body('data.attributes.odsCode').notEmpty()
];

export const registrationRequest = async (req, res) => {
  const config = initializeConfig();
  const { id: conversationId, attributes } = req.body.data;
  const { nhsNumber, odsCode } = attributes;

  try {
    await createRegistrationRequest(conversationId, nhsNumber, odsCode);
    const statusEndpoint = `${config.url}/deduction-requests/${conversationId}`;

    res.set('Location', statusEndpoint).sendStatus(204);
  } catch (err) {
    logError('Registration request failed', err);
    res.status(503).json({
      errors: err.message
    });
  }
};
