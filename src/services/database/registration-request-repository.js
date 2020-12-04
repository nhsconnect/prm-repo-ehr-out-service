import ModelFactory from '../../models';
import { modelName } from '../../models/registration-request';
import {runWithinTransaction} from "./helper";

const RegistrationRequest = ModelFactory.getByName(modelName);

export const getRegistrationRequestStatusByConversationId = conversationId => {
  return RegistrationRequest.findByPk(conversationId);
};

export const updateRegistrationRequestStatus = async (conversationId, status) => {
  await runWithinTransaction(async transaction => {
    return await RegistrationRequest.update(
      { status },
      {
        where: { conversation_id: conversationId },
        transaction
      }
    );
  });
};