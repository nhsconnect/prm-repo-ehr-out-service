import ModelFactory from '../../models';
import { modelName } from '../../models/registration-request';
import { runWithinTransaction } from './helper';
import { logError, logInfo } from '../../middleware/logging';
import { NhsNumberNotFoundError } from "../../errors/errors";
import { Op } from "sequelize";

const RegistrationRequest = ModelFactory.getByName(modelName);

export const getRegistrationRequestByConversationId = conversationId => {
  return RegistrationRequest.findByPk(conversationId);
};

export const getNhsNumberByConversationId = conversationId => {
    return RegistrationRequest.findByPk(conversationId).then(record => {
        if (!record) {
            throw new NhsNumberNotFoundError(`No record for NHS number related to conversation ID ${conversationId}`);
        }
        return record.nhsNumber
    });
};

export const updateRegistrationRequestStatus = async (conversationId, status) => {
  logInfo(`Updating registration request status ${status}, conversationId: ${conversationId}`);
  await runWithinTransaction(async transaction => {
    const options = {
      where: { conversation_id: conversationId },
      transaction: transaction
    }

    return await RegistrationRequest.update({ status }, options)
  });
};

export const registrationRequestExistsWithMessageId = async messageId => {
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