import { runWithinTransaction } from './helper';
import { logError, logInfo } from "../../middleware/logging";
import ModelFactory from '../../models';
import { modelName, Status } from '../../models/registration-request';

const RegistrationRequest = ModelFactory.getByName(modelName);

export const createRegistrationRequest = (conversationId, nhsNumber, odsCode) =>
  runWithinTransaction(transaction =>
    RegistrationRequest.create(
      {
        conversationId,
        nhsNumber,
        odsCode,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      },
      { transaction: transaction }
    )
      .then(() => logInfo('Registration request has been stored'))
      .catch(error => logError(error))
  );