import { parseConversationId } from "../parser/parsing-utilities";
import { logError, logInfo } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { ACKNOWLEDGEMENT_TYPES } from "../../constants/acknowledgement-types";
import { parseAcknowledgementMessage } from "../parser/acknowledgement-parser";

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const { acknowledgementTypeCode, acknowledgementDetail } = await parseAcknowledgementMessage(message);

  setCurrentSpanAttributes({ conversationId });

  if (ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(acknowledgementTypeCode)) {
    logInfo(`POSITIVE ACKNOWLEDGEMENT RECEIVED`);
  } else if (ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(acknowledgementTypeCode)) {
    logInfo(`NEGATIVE ACKNOWLEDGEMENT RECEIVED - DETAIL: ${acknowledgementDetail}`);
  } else {
    logError(`ACKNOWLEDGEMENT TYPE ${acknowledgementTypeCode} IS UNKNOWN.`);
  }
};