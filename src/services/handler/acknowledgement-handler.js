import {
  parseConversationId
} from "../parser/parsing-utilities";
import { logError, logInfo } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { ACKNOWLEDGEMENT_TYPES } from "../../constants/acknowledgement-types";
import { parseCommonAcknowledgementFields } from "../parser/acknowledgement-parser";

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const commonFields = await parseCommonAcknowledgementFields(message);

  setCurrentSpanAttributes({ conversationId });

  switch (commonFields.acknowledgementTypeCode) {
    case ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(commonFields.acknowledgementTypeCode):
      // TODO: This falls within the scope of another ticket.
      break;
    case ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(commonFields.acknowledgementTypeCode):
      logInfo(`NEGATIVE ACKNOWLEDGEMENT RECEIVED IN RESPONSE TO MESSAGE ID ${commonFields.referencedMessageId}`);
      break;
    default:
      logError(`ACKNOWLEDGEMENT TYPE ${commonFields.acknowledgementTypeCode} IS UNKNOWN.`);
      break;
  }
};