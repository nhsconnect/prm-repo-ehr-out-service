import ModelFactory from '../../models';
import { modelName } from '../../models/message-fragment';
import { runWithinTransaction } from './helper';
import { logError, logInfo, logWarning } from "../../middleware/logging";
import {FragmentMessageRecordNotFoundError} from "../../errors/errors";

const MessageFragment = ModelFactory.getByName(modelName);

export const getMessageFragmentStatusByMessageId = messageId => {
  logInfo(`Getting the status of fragment with message id ${messageId} from database`);

  // TODO: refactor this to a better shape
  try {
    return MessageFragment.findByPk(messageId);
  } catch (error) {
    logError("Encountered error during database transaction", error)
    return Promise.resolve(null);
  }
};

export const updateMessageFragmentStatus = (messageId, status) => {
  logInfo(`Updating message fragment status to ${status}`);


  return runWithinTransaction(transaction =>
      getMessageFragmentStatusByMessageId(messageId)
        .then(record => {
          if (!record) {
            throw new FragmentMessageRecordNotFoundError(messageId);
          }
          record.status = status
          return record.save()
        })
    .then(() => logInfo('Updated message fragment status has been stored'))
  )
};
