import { setCurrentSpanAttributes } from '../../config/tracing';
import { logError, logInfo } from '../../middleware/logging';
import { getRegistrationRequestStatusByConversationId } from '../database/registration-request-repository';

export default async function newRegistrationRequest(parsedMessage) {
  const { conversationId, interactionId, nhsNumber, odsCode, ehrRequestId } = parsedMessage;
  setCurrentSpanAttributes(conversationId);
  logInfo('Create registration request received');

  try {
    const previousRegistration = await getRegistrationRequestStatusByConversationId(conversationId);
  } catch (err) {
    console.log('registration request fail' + err);
    logError('Registration request failed', err);
  }
}
