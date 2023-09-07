import { modelName, Status } from '../../models/message-fragment';
import { logError, logInfo } from "../../middleware/logging";
import { runWithinTransaction } from './helper';
import ModelFactory from '../../models';

const MessageFragment = ModelFactory.getByName(modelName);

export const createFragmentDbRecord = (messageId, conversationId) => {
  logInfo(`Creating a record for fragment in database, message id: ${messageId}`);

  return runWithinTransaction(transaction =>
    MessageFragment.create(
      {
        messageId,
        conversationId,
        status: Status.FRAGMENT_REQUEST_RECEIVED
      },
      { transaction: transaction }
    )
    .then(() => logInfo('Message fragment status has been updated'))
    .catch(error => logError(`Got error while trying to create record for messageId: ${messageId}`, error))
  );
}