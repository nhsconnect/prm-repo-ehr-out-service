import { runWithinTransaction } from './helper';
import { logError, logInfo } from "../../middleware/logging";
import ModelFactory from '../../models';
import { modelName, Status } from '../../models/fragments-trace';

const FragmentsTrace = ModelFactory.getByName(modelName);

export const createFragmentsTrace = (messageId, conversationId) =>
  runWithinTransaction(transaction =>
    FragmentsTrace.create(
      {
        messageId,
        conversationId,
        status: Status.FRAGMENT_REQUEST_RECEIVED
      },
      transaction
    )
      .then(() => logInfo('Fragments trace has been stored'))
      .catch(error => logError(error))
  );