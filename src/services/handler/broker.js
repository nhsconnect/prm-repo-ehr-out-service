import { INTERACTION_IDS } from '../../constants/interaction-ids';
import { logError, logInfo } from '../../middleware/logging';
import ehrRequestHandler from './ehr-request-handler';
import {setCurrentSpanAttributes} from "../../config/tracing";
import continueMessageHandler from "./continue-message-handler";
import { acknowledgementMessageHandler } from "./acknowledgement-handler";

export default async function sendMessageToCorrespondingHandler(parsedMessage) {
  const { conversationId } = parsedMessage;
  setCurrentSpanAttributes({ conversationId: conversationId });

  switch (parsedMessage.interactionId) {
    case INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID:
      logInfo('Message Type: EHR REQUEST');
      await ehrRequestHandler(parsedMessage);
      break;
    case INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID:
      logInfo('Message Type: EHR CONTINUE REQUEST');
      await continueMessageHandler(parsedMessage);
      break;
    case INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID:
      logInfo('Message Type: ACKNOWLEDGEMENT');
      acknowledgementMessageHandler(parsedMessage);
      break;
    default:
      // eslint-disable-next-line no-case-declarations
      const error = new Error('Invalid interaction ID: ' + parsedMessage.interactionId);
      logError(error.message);
      throw error;
  }
}
