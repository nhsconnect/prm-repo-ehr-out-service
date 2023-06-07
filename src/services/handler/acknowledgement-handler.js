import { parseConversationId } from "../parser/parsing-utilities";
import { logError, logInfo } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { ACKNOWLEDGEMENT_TYPES } from "../../constants/acknowledgement-types";
import { parseAcknowledgementMessage } from "../parser/acknowledgement-parser";
import { createAcknowledgement } from "../database/create-acknowledgement";

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const parsedAcknowledgementFields = await parseAcknowledgementMessage(message);
  const typeCode = parsedAcknowledgementFields.acknowledgementTypeCode;

  setCurrentSpanAttributes({ conversationId });

  await createAcknowledgement(parsedAcknowledgementFields);

  if (ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(typeCode)) {
    logInfo(`POSITIVE ACKNOWLEDGEMENT RECEIVED`);
  } else if (ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(typeCode)) {
    logInfo(`NEGATIVE ACKNOWLEDGEMENT RECEIVED - DETAIL: ${parsedAcknowledgementFields.acknowledgementDetail}`);
  } else {
    logError(`ACKNOWLEDGEMENT TYPE ${typeCode} IS UNKNOWN.`);
  }
};