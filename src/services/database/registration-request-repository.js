import ModelFactory from '../../models';
import { modelName } from '../../models/registration-request';

const RegistrationRequest = ModelFactory.getByName(modelName);

export const getRegistrationRequestStatusByConversationId = conversationId => {
  return RegistrationRequest.findByPk(conversationId);
};
