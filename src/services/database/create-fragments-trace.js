import { runWithinTransaction } from './helper';
import { logInfo } from '../../middleware/logging';
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
      .then(requests => requests[0])
      .then(() => logInfo('Fragments trace has been stored'))
  );
