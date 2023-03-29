import ModelFactory from '../../models';
import { modelName } from '../../models/message-fragment';
import { runWithinTransaction } from './helper';
import { logInfo, logWarning } from "../../middleware/logging";

const MessageFragment = ModelFactory.getByName(modelName);

export const getMessageFragmentStatusByMessageId = async messageId => {
  return MessageFragment.findByPk(messageId);
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
