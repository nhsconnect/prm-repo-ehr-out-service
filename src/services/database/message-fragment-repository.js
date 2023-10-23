import { FragmentMessageRecordNotFoundError } from "../../errors/errors";
import { modelName } from '../../models/message-fragment';
import { logInfo } from '../../middleware/logging';
import ModelFactory from '../../models';

const MessageFragment = ModelFactory.getByName(modelName);

export const getMessageFragmentRecordByMessageId = messageId => {
  logInfo(`Getting the status of fragment with message id ${messageId} from database`);
  return MessageFragment.findByPk(messageId);
};

export const getAllMessageFragmentRecordsByMessageIds = async messageIds => {
  return MessageFragment.findAll({
    where: {
      messageId: messageIds
    }
  }).then(messageFragments => {
      verifyMessageFragmentWasFoundForEachMessageId(messageIds, messageFragments)
      return messageFragments;
    });
}

const verifyMessageFragmentWasFoundForEachMessageId = (messageIds, messageFragments) => {
  if (messageFragments.length !== messageIds.length) {
    const messageIdsWithNoMessageFragment = messageFragments.map(messageFragment => {
      if (!messageIds.contains(messageFragment.messageId)) {
        return messageFragments.messageId
      }
      throw new FragmentMessageRecordNotFoundError(messageIdsWithNoMessageFragment);
    });
  }
}

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