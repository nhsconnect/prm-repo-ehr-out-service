import ModelFactory from '../../models';
import { modelName } from '../../models/message-id-replacement';
import { FragmentMessageIdReplacementRecordNotFoundError } from '../../errors/errors';

const MessageIdReplacement = ModelFactory.getByName(modelName);

export const getAllMessageIdReplacements = async oldMessageIds => {
  return MessageIdReplacement.findAll({
    where: {
      oldMessageId: oldMessageIds
    }
  }).then(messageIdReplacements => {
    verifyMessageIdReplacementWasFoundForEachMessageId(oldMessageIds, messageIdReplacements);

    return messageIdReplacements.map(messageIdReplacement => {
      return {
        oldMessageId: messageIdReplacement.oldMessageId,
        newMessageId: messageIdReplacement.newMessageId.toUpperCase()
      }
    });
  });
}

const verifyMessageIdReplacementWasFoundForEachMessageId = (oldMessageIds, messageIdReplacements) => {
  if (messageIdReplacements.length !== oldMessageIds.length)
    throw new FragmentMessageIdReplacementRecordNotFoundError(oldMessageIds.length, messageIdReplacements.length);
}