import { parseConversationId } from "../parser/parsing-utilities";
import {logError, logInfo} from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { ACKNOWLEDGEMENT_TYPES } from "../../constants/acknowledgement-types";
import { parseAcknowledgementMessage } from "../parser/acknowledgement-parser";
import { createAcknowledgement } from "../database/create-acknowledgement";
import { registrationRequestExistsWithMessageId } from "../database/registration-request-repository";

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const parsedAcknowledgementFields = await parseAcknowledgementMessage(message);
  const typeCode = parsedAcknowledgementFields.acknowledgementTypeCode;
  const isIntegrationAcknowledgement = await registrationRequestExistsWithMessageId(
      parsedAcknowledgementFields.messageRef
  );

  setCurrentSpanAttributes({ conversationId });

  await createAcknowledgement(parsedAcknowledgementFields);

  if (ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(typeCode))
    isIntegrationAcknowledgement ? handlePositiveIntegrationAcknowledgement() : handlePositiveAcknowledgement();
  else if (ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(typeCode))
    isIntegrationAcknowledgement ? handleNegativeIntegrationAcknowledgement() : handleNegativeAcknowledgement();
  else
    logError(`ACKNOWLEDGEMENT TYPE ${typeCode} IS UNKNOWN.`);
};

const handlePositiveIntegrationAcknowledgement = () => {
  logInfo(`POSITIVE INTEGRATION ACKNOWLEDGEMENT RECEIVED`);
};

const handleNegativeIntegrationAcknowledgement = () => {
  logInfo(`NEGATIVE INTEGRATION ACKNOWLEDGEMENT RECEIVED`);
};

const handlePositiveAcknowledgement = () => {
  logInfo(`POSITIVE ACKNOWLEDGEMENT RECEIVED`);
};

const handleNegativeAcknowledgement = () => {
  logInfo(`NEGATIVE ACKNOWLEDGEMENT RECEIVED`);
};