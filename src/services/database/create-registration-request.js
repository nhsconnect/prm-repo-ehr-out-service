import { modelName, Status } from '../../models/registration-request';
import { logError, logInfo } from "../../middleware/logging";
import { runWithinTransaction } from './helper';
import ModelFactory from '../../models';

const RegistrationRequest = ModelFactory.getByName(modelName);

export const createRegistrationRequest = (conversationId, messageId, nhsNumber, odsCode) =>
  runWithinTransaction(transaction =>
    RegistrationRequest.create(
      {
        conversationId,
        nhsNumber,
        messageId,
        odsCode,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      },
      { transaction: transaction }
    )
      .then(() => logInfo('Registration request has been stored'))
      .catch(error => logError(error))
  );