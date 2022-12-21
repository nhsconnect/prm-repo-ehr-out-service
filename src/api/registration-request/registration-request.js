import {body} from 'express-validator';
import {logInfo} from '../../middleware/logging';
import {initializeConfig} from '../../config';
import {transferOutEhr} from "../../services/transfer/transfer-out-ehr";

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

// TODO needs rename this is a request for EHR, 'registration request' is old terminology coupling
// this to the process of registering which is correlated but not the same thing
export const registrationRequest = async (req, res) => {
  logInfo('Create registration request received');

  const { id: conversationId, attributes } = req.body.data;
  const { nhsNumber, odsCode, ehrRequestId } = attributes;

  const result = await transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId });
  if (result.inProgress) {
    res.status(409).json({
      error: `EHR out transfer with this conversation ID is already in progress`
    });
  }
  else if (result.hasFailed) {
    res.status(503).json({
      errors: result.error
    });
  }
  else {
    respondWithItsFineGoLookAtTheStatus(res, conversationId);
  }
};

const respondWithItsFineGoLookAtTheStatus = (res, conversationId) => {
  const config = initializeConfig();
  const statusEndpoint = `${config.repoToGpServiceUrl}/registration-requests/${conversationId}`;
  res.set('Location', statusEndpoint).sendStatus(204);
};
