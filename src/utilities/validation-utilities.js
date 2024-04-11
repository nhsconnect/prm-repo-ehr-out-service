import { validate } from "uuid";
import { ValidationError } from "../errors/errors";

export const validateIds = (conversationId, messageId) => {
  const uuidsAreValid = validate(conversationId) && validate(messageId);
  if (!uuidsAreValid) {
    throw new ValidationError(
        'received invalid uuid as either conversationId or messageId. ' +
        `ConversationId: ${conversationId}, messageId: ${messageId}`
    );
  }
};