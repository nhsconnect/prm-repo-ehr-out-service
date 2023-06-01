import ModelFactory from '../../models';
import { modelName } from '../../models/message-id-replacement';
import { FragmentMessageIdReplacementRecordNotFoundError } from '../../errors/errors';

const MessageIdReplacement = ModelFactory.getByName(modelName);

export const getNewMessageIdByOldMessageId = async oldMessageId => {
  return MessageIdReplacement.findByPk(oldMessageId).then(record => {
    if (!record) {
      throw new FragmentMessageIdReplacementRecordNotFoundError(oldMessageId);
    }
    // Uppercase the newMessageId here, as postgres db auto converts stored UUIDs to lowercase
    return record.newMessageId.toUpperCase();
  });
};
