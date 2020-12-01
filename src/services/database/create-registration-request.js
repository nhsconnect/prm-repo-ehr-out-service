import { runWithinTransaction } from './helper';
import { logEvent } from '../../middleware/logging';
import ModelFactory from '../../models';
import { modelName } from '../../models/registration-request';

const RegistrationRequest = ModelFactory.getByName(modelName);

export const createRegistrationRequest = (conversationId, nhsNumber, odsCode) =>
  runWithinTransaction(transaction =>
    RegistrationRequest.create(
      {
        conversationId,
        nhsNumber,
        odsCode
      },
      transaction
    )
      .then(requests => requests[0])
      .then(() => logEvent('Registration request has been stored'))
  );
