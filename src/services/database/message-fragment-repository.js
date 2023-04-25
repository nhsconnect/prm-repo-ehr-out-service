import ModelFactory from '../../models';
import { modelName } from '../../models/message-fragment';
import { runWithinTransaction } from './helper';
import { logInfo } from "../../middleware/logging";
import {FragmentMessageRecordNotFoundError} from "../../errors/errors";

const MessageFragment = ModelFactory.getByName(modelName);

export const getMessageFragmentStatusByMessageId = messageId => {
  return MessageFragment.findByPk(messageId);
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
