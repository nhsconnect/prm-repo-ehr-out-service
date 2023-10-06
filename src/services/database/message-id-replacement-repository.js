import ModelFactory from '../../models';
import messageIdReplacement, { modelName } from '../../models/message-id-replacement';
import { FragmentMessageIdReplacementRecordNotFoundError } from '../../errors/errors';

const MessageIdReplacement = ModelFactory.getByName(modelName);

// PRMT-4074 REMOVE THIS
// export const getNewMessageIdByOldMessageId = async oldMessageId => {
//   return MessageIdReplacement.findByPk(oldMessageId).then(record => {
//     if (!record) {
//       throw new FragmentMessageIdReplacementRecordNotFoundError(oldMessageId);
//     }
//     // Uppercase the newMessageId here, as postgres db auto converts stored UUIDs to lowercase
//     return record.newMessageId.toUpperCase();
//   });
// };

export const getAllMessageIdsWithReplacementsByOldMessageIds = async oldMessageIds => {
  MessageIdReplacement.findAll({
    where: {
      oldMessageId: oldMessageIds
    }
  }).then(messageIdReplacements => {
    verifyMessageIdReplacementWasFoundForEachMessageId(oldMessageIds, messageIdReplacements);

    return messageIdReplacements.map(messageIdReplacement => {
      return {
        oldMessageId: messageIdReplacement.oldMessageId,
        // Uppercase the newMessageId here, as postgres db auto converts stored UUIDs to lowercase
        newMessageId: messageIdReplacement.newMessageId.toUpperCase()
      }
    });
  });
}

const verifyMessageIdReplacementWasFoundForEachMessageId = (oldMessageIds, messageIdReplacements) => {
  if (messageIdReplacements.length !== oldMessageIds.length) {
    const messageIdsWithNoReplacementRecord = messageIdReplacements.map(messageIdReplacement => {
      if (!oldMessageIds.contains(messageIdReplacement.oldMessageId)) {
        return messageIdReplacements.oldMessageId
      }
      throw new FragmentMessageIdReplacementRecordNotFoundError(messageIdsWithNoReplacementRecord);
    });
  }
}
