import ModelFactory from '../../models';
import { modelName } from '../../models/registration-request';
import { runWithinTransaction } from './helper';
import { logError, logInfo } from '../../middleware/logging';
import { NhsNumberNotFoundError } from "../../errors/errors";
import { Op } from "sequelize";

const RegistrationRequest = ModelFactory.getByName(modelName);

export const getRegistrationRequestByConversationId = async conversationId => {
  /**
   * @deprecated
   * replaced by new method `getOutboundConversationById`
   * to be deleted in PRMT-4588
   */
  return await RegistrationRequest.findByPk(conversationId);
};

export const getNhsNumberByConversationId = conversationId => {
  /**
   * @deprecated
   * replaced by new method `getNhsNumberByOutboundConversationId`
   * to be deleted in PRMT-4588
   */
    return RegistrationRequest.findByPk(conversationId)
      .then(record => {
        if (!record) {
            throw new NhsNumberNotFoundError();
        }
        return record.nhsNumber;
    });
};

export const updateRegistrationRequestStatus = async (conversationId, status) => {
  /**
   * @deprecated
   * replaced by new method `updateOutboundConversationStatus`
   * to be deleted in PRMT-4588
   */
  logInfo(`Updating registration request status ${status}, conversationId: ${conversationId}`);
  await runWithinTransaction(async transaction => {
    const options = {
      where: { conversation_id: conversationId },
      transaction: transaction
    }

    return await RegistrationRequest.update({ status }, options);
  });
};

export const updateRegistrationRequestMessageId = async (originalMessageId, updatedMessageId) => {
  /**
   * @deprecated
   * redundant in new database schema, as the core messageId will be stored at core level
   * no need replacement method
   * to be deleted in PRMT-4588
   */
  logInfo(`Updating Message ID from ${originalMessageId}, to: ${updatedMessageId}`);
  await runWithinTransaction(async transaction => {
    const options = {
      where: { message_id: originalMessageId },
      transaction: transaction
    }

    return await RegistrationRequest.update({ messageId: updatedMessageId }, options);
  });
};

export const registrationRequestExistsWithMessageId = async messageId => {
  /**
   * @deprecated
   * to be replaced by new method at core level
   * to be deleted in PRMT-4588
   */
  const foundRecord = await RegistrationRequest.findOne({
        where: {
            messageId: {
                [Op.eq]: messageId
            }
        }
    }).then(registrationRequest => registrationRequest)
      .catch(error => logError(error));

    return foundRecord !== null;
}