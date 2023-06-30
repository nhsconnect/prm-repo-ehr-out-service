import { parseConversationId } from "../parser/parsing-utilities";
import { logError, logInfo } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { ACKNOWLEDGEMENT_TYPES } from "../../constants/acknowledgement-types";
import { parseAcknowledgementMessage } from "../parser/acknowledgement-parser";
import { createAcknowledgement } from "../database/create-acknowledgement";
import { sendDeleteRequestToEhrRepo } from "../ehr-repo/delete-ehr";
import {
  getNhsNumberByConversationId,
  registrationRequestExistsWithMessageId
} from "../database/registration-request-repository";

export const acknowledgementMessageHandler = async message => {
  const conversationId = await parseConversationId(message);
  const parsedAcknowledgementFields = await parseAcknowledgementMessage(message);
  const { typeCode, messageRef } = parsedAcknowledgementFields;
  const isIntegrationAcknowledgement = await registrationRequestExistsWithMessageId(messageRef);
  const nhsNumber = await getNhsNumberByConversationId(conversationId);

  setCurrentSpanAttributes({ conversationId });

  await createAcknowledgement(parsedAcknowledgementFields);

  if (ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(typeCode)) {
    if (isIntegrationAcknowledgement) await handlePositiveIntegrationAcknowledgement(nhsNumber, conversationId);
    else handlePositiveAcknowledgement();
  } else if (ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(typeCode)) {
    if (isIntegrationAcknowledgement) handleNegativeIntegrationAcknowledgement();
    else handleNegativeAcknowledgement();
  } else {
    logError(`ACKNOWLEDGEMENT TYPE ${typeCode} IS UNKNOWN.`);
  }
};

const handlePositiveIntegrationAcknowledgement = async (nhsNumber, conversationId) => {
  const usefulDetails = `for Conversation ID ${conversationId}, and NHS number ${nhsNumber}.`;
  logInfo(`Positive integration acknowledgement received ${usefulDetails}`);
  logInfo(`Sending delete request to ehr out repository ${usefulDetails}`);

  await sendDeleteRequestToEhrRepo(nhsNumber, conversationId);
};

const handleNegativeIntegrationAcknowledgement = () => {
  logInfo(`Negative integration acknowledgement received.`);
};

const handlePositiveAcknowledgement = () => {
  logInfo(`Positive acknowledgement received.`);
};

const handleNegativeAcknowledgement = () => {
  logInfo(`Negative acknowledgement received.`);
};