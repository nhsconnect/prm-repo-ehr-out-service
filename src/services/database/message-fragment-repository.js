import { FragmentMessageRecordNotFoundError } from "../../errors/errors";
import { modelName } from '../../models/message-fragment';
import { logInfo } from '../../middleware/logging';
import ModelFactory from '../../models';

const MessageFragment = ModelFactory.getByName(modelName);

export const getMessageFragmentRecordByMessageId = messageId => {
  logInfo(`Getting the status of fragment with message id ${messageId} from database`);
  return MessageFragment.findByPk(messageId);
};

export const updateMessageFragmentRecordStatus = (messageId, status) => {
  logInfo(`Updating message fragment status to ${status}`);

  return getMessageFragmentRecordByMessageId(messageId)
    .then(record => {
      if (!record) throw new FragmentMessageRecordNotFoundError(messageId);

      record.status = status;
      return record.save();
    })
    .then(() => logInfo('Updated message fragment status has been stored'));
};