import { FragmentMessageRecordNotFoundError } from "../../errors/errors";
import {modelName, Status} from '../../models/message-fragment';
import { logInfo } from '../../middleware/logging';
import ModelFactory from '../../models';
import { Op } from "sequelize";

const MessageFragment = ModelFactory.getByName(modelName);

export const getMessageFragmentRecordByMessageId = messageId => {
  logInfo(`Getting the status of fragment with message id ${messageId} from database`);
  return MessageFragment.findByPk(messageId);
};

export const getAllMessageFragmentRecordsByMessageIds = messageIds => {
  return MessageFragment.findAll({
    where: {
      messageId: messageIds,
    }
  }).then(messageFragmentRecords => {
      logInfo(JSON.stringify(messageFragmentRecords));
      logInfo(`Successfully retrieved ${messageFragmentRecords.length} verified Message Fragment record(s).`);
      return messageFragmentRecords;
    });
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

export const getAllFragmentOutboundMessageIdsEligibleToBeSent = conversationId => {
  return MessageFragment.findAll({
    where: {
      conversationId,
      status: {
        [Op.notIn]: [Status.SENT_FRAGMENT, Status.MISSING_FROM_REPO]
      }
    }
  }).then(eligibleRecords => {
    logInfo(`Found ${eligibleRecords.length} eligible records, returning the Outbound Message ID(s).`)
    return eligibleRecords
        .map(record => record.messageId.toUpperCase())
  })
}