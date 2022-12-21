import { INTERACTION_IDS } from '../../constants/interaction-ids';
import { logError, logInfo } from '../../middleware/logging';
import ehrRequestHandler from './ehrRequestHandler';

export default function sendMessageToCorrespondingHandler(parsedMessage) {
  switch (parsedMessage.interactionId) {
    case INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID:
      logInfo('Message Type: EHR REQUEST');
      ehrRequestHandler();
      break;
    default:
      const error = new Error('Invalid interaction ID: ' + parsedMessage.interactionId);
      logError(error.message);
      throw error;
  }
}
