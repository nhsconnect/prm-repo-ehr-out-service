import { runWithinTransaction } from './helper';
import { logError, logInfo } from "../../middleware/logging";
import ModelFactory from '../../models';
import { modelName, Status } from '../../models/message-fragment';

const MessageFragment = ModelFactory.getByName(modelName);

export const createMessageFragment = (messageId, conversationId) =>
  runWithinTransaction(transaction =>
    MessageFragment.create(
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