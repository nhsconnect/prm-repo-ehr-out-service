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
  const { acknowledgementTypeCode, messageRef, acknowledgementDetail } = parsedAcknowledgementFields;
  const isIntegrationAcknowledgement = await registrationRequestExistsWithMessageId(messageRef);
  const nhsNumber = await getNhsNumberByConversationId(conversationId);

  setCurrentSpanAttributes({ conversationId });

  await createAcknowledgement(parsedAcknowledgementFields);

  if (ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(acknowledgementTypeCode)) {
    if (isIntegrationAcknowledgement) await handlePositiveIntegrationAcknowledgement(nhsNumber, conversationId);
    else handlePositiveAcknowledgement();
  } else if (ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(acknowledgementTypeCode)) {
    if (isIntegrationAcknowledgement) handleNegativeIntegrationAcknowledgement();
    else handleNegativeAcknowledgement(acknowledgementDetail);
  } else {
    logError(`Acknowledgement type ${acknowledgementTypeCode} is unknown.`);
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

const handleNegativeAcknowledgement = (acknowledgementDetail) => {
  logInfo(`Negative acknowledgement received - detail: ${acknowledgementDetail}.`);
};