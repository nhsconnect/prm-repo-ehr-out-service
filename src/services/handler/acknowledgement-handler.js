import {
  parseConversationId
} from "../parser/parsing-utilities";
import { logError, logInfo } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { ACKNOWLEDGEMENT_TYPES } from "../../constants/acknowledgement-types";
import { parseAcknowledgementFields } from "../parser/acknowledgement-parser";

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const { acknowledgementTypeCode } = await parseAcknowledgementFields(message);

  setCurrentSpanAttributes({ conversationId });

  switch (acknowledgementTypeCode) {
    case ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(acknowledgementTypeCode):
      logInfo(`POSITIVE ACKNOWLEDGEMENT RECEIVED`);
      break;
    case ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(acknowledgementTypeCode):
      logInfo(`NEGATIVE ACKNOWLEDGEMENT RECEIVED`);
      break;
    default:
      logError(`ACKNOWLEDGEMENT TYPE ${acknowledgementTypeCode} IS UNKNOWN.`);
      break;
  }
};