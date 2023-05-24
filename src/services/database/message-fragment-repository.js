import ModelFactory from '../../models';
import { modelName } from '../../models/message-fragment';
import { runWithinTransaction } from './helper';
import { logError, logInfo, logWarning } from "../../middleware/logging";

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

export const updateMessageFragmentStatus = async (messageId, status) => {
  logInfo(`Updating message fragment status to ${status}`);

  await runWithinTransaction(async transaction => {
    return await MessageFragment.update(
      { status },
      {
        where: { message_id: messageId },
        transaction
      }
    );
  });
};
