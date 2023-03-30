import axios from "axios";
import { logInfo } from "../../middleware/logging";
import { DownloadError, StatusUpdateError } from "../../errors/errors";
import { getPdsOdsCode } from "../gp2gp/pds-retrieval-request";
import { updateRegistrationRequestStatus } from "../database/registration-request-repository";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { updateMessageFragmentStatus } from "../database/message-fragment-repository";

export const downloadFromUrl = async (messageUrl) => {
  return axios.get(messageUrl)
    .then(response => response.data)
    .catch(error => { throw new DownloadError(error) });
};

export const patientAndPracticeOdsCodesMatch = async (patientNhsNumber, gpPracticeOdsCode) => {
  logInfo('Getting patient current ODS code');
  const patientOdsCode = await getPdsOdsCode(patientNhsNumber);
  return patientOdsCode === gpPracticeOdsCode;
};

export const updateConversationStatus = async (conversationId, status, logMessage) => {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Updating conversation with status: ${status}`);

  await updateRegistrationRequestStatus(conversationId, status)
    .then()
    .catch(error => { throw new StatusUpdateError(error); });

  if (logMessage) logInfo(logMessage);
};

export const updateFragmentStatus = async (conversationId, messageId, status, logMessage) => {
  setCurrentSpanAttributes({ conversationId, messageId });
  logInfo(`Updating fragment with status: ${status}`);

  await updateMessageFragmentStatus(messageId, status)
    .then()
    .catch(error => { throw new StatusUpdateError(error); });

  if (logMessage) logInfo(logMessage);
};
