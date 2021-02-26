import { runWithinTransaction } from './helper';
import { logInfo } from '../../middleware/logging';
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
      transaction
    )
      .then(requests => requests[0])
      .then(() => logInfo('Registration request has been stored'))
  );
