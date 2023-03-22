import axios from "axios";
import { logInfo } from "../../middleware/logging";
import { DownloadError } from "../../errors/errors";
import { getPdsOdsCode } from "../gp2gp/pds-retrieval-request";
import { updateRegistrationRequestStatus } from "../database/registration-request-repository";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { updateFragmentsTraceStatus } from "../database/fragments-trace-repository";

export const downloadFromUrl = async (messageUrl) => {
  return axios.get(messageUrl)
    .then(response => response.data)
    .catch(error => { throw new DownloadError(error) });
};

export const patientAndPracticeOdsCodesMatch = async (patientNhsNumber, practiceOdsCode) => {
  logInfo('Getting patient current ODS code');
  const patientOdsCode = await getPdsOdsCode(patientNhsNumber);
  return patientOdsCode === practiceOdsCode;
};

export const updateConversationStatus = async (conversationId, status) => {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Updating conversation with status: ${status}`);

  await updateRegistrationRequestStatus(conversationId, status);
};

export const updateFragmentStatus = async (conversationId, messageId, status) => {
  setCurrentSpanAttributes({ conversationId, messageId });
  logInfo(`Updating fragment with status ${status}`);

  await updateFragmentsTraceStatus(messageId, status);
};
