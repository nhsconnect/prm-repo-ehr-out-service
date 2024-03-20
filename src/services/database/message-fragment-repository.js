import { FragmentMessageRecordNotFoundError } from '../../errors/errors';
import { modelName, Status } from '../../models/message-fragment';
import { logInfo } from '../../middleware/logging';
import ModelFactory from '../../models';
import { Op } from 'sequelize';

const MessageFragment = ModelFactory.getByName(modelName);

const getMessageFragmentRecordByMessageId = messageId => {
  /**
   * @deprecated
   * seems to be only used in this module or in tests.
   * will not make replacement for this method.
   * to be deleted in PRMT-4588
   */
  logInfo(`Getting the status of fragment with message id ${messageId} from database`);
  return MessageFragment.findByPk(messageId);
};

const getAllMessageFragmentRecordsByMessageIds = messageIds => {
  /**
   * @deprecated
   * seems to be only used in tests. will not make replacement for this method.
   * to be deleted in PRMT-4588
   */
  return MessageFragment.findAll({
    where: {
      messageId: messageIds
    }
  }).then(messageFragmentRecords => {
    logInfo(JSON.stringify(messageFragmentRecords));
    logInfo(
      `Successfully retrieved ${messageFragmentRecords.length} verified Message Fragment record(s).`
    );
    return messageFragmentRecords;
  });
};

const updateMessageFragmentRecordStatus = (messageId, status) => {
  /**
   * @deprecated
   * replaced by new method `updateFragmentStatusInDb`
   * to be deleted in PRMT-4588
   */
  logInfo(`Updating message fragment status to ${status}`);

  return getMessageFragmentRecordByMessageId(messageId)
    .then(record => {
      if (!record) throw new FragmentMessageRecordNotFoundError(messageId);

      record.status = status;
      return record.save();
    })
    .then(() => logInfo('Updated message fragment status has been stored'));
};

const getAllFragmentOutboundMessageIdsEligibleToBeSent = conversationId => {
  /**
   * @deprecated
   * replaced by new method `getAllFragmentIdsToBeSent`
   * to be deleted in PRMT-4588
   */

  return MessageFragment.findAll({
    where: {
      conversationId,
      status: {
        [Op.notIn]: [Status.SENT_FRAGMENT, Status.MISSING_FROM_REPO]
      }
    }
  }).then(eligibleRecords => {
    logInfo(
      `Found ${eligibleRecords.length} eligible records, returning the Outbound Message ID(s).`
    );
    return eligibleRecords.map(record => record.messageId.toUpperCase());
  });
};
