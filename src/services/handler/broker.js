import { INTERACTION_IDS } from '../../constants/interaction-ids';
import { logError, logInfo } from '../../middleware/logging';
import ehrRequestHandler from './ehr-request-handler';
import {setCurrentSpanAttributes} from "../../config/tracing";
import continueRequestHandler from "./continue-request-handler";

export default async function sendMessageToCorrespondingHandler(parsedMessage) {
  const { conversationId } = parsedMessage;
  setCurrentSpanAttributes({ conversationId: conversationId });

  switch (parsedMessage.interactionId) {
    case INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID:
      logInfo('Message Type: EHR REQUEST');
      await ehrRequestHandler(parsedMessage);
      break;
    case INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID:
      logInfo('Message Type: EHR CONTINUE REQUEST')
      await continueRequestHandler(parsedMessage);
      break;
    case INTERACTION_IDS.CONTINUE_FRAGMENT_INTERACTION_ID:
      // TODO Code
      logInfo('Message Type: EHR FRAGMENT CONTINUE')
      break;
    default:
      // eslint-disable-next-line no-case-declarations
      const error = new Error('Invalid interaction ID: ' + parsedMessage.interactionId);
      logError(error.message);
      throw error;
  }
}
