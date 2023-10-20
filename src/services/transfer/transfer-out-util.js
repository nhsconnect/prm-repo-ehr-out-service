import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { logInfo } from '../../middleware/logging';
import {
  DownloadError,
  StatusUpdateError
} from '../../errors/errors';
import { getPdsOdsCode } from '../gp2gp/pds-retrieval-request';
import { updateRegistrationRequestStatus } from '../database/registration-request-repository';
import { updateMessageFragmentRecordStatus } from '../database/message-fragment-repository';
import { createMessageIdReplacements } from '../database/create-message-id-replacements';

export const downloadFromUrl = async messageUrl => {
  return axios
    .get(messageUrl)
    .then(response => response.data)
    .catch(error => {
      throw new DownloadError(error);
    });
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
    .catch(error => {
      throw new StatusUpdateError(error);
    });

  if (logMessage) logInfo(logMessage);
};

export const updateFragmentStatus = async (conversationId, messageId, status) => {
  setCurrentSpanAttributes({ conversationId, messageId });
  logInfo(`Updating fragment with status: ${status}`);

  await updateMessageFragmentRecordStatus(messageId, status)
    .then()
    .catch(error => {
      throw new StatusUpdateError(error);
    });

  logInfo(`Updated fragment status to: ${status}`);
};

export const replaceMessageIdsInObject = (ehrMessage, messageIdReplacements) => {
  let ehrMessageJsonString = JSON.stringify(ehrMessage);

  messageIdReplacements.forEach(messageIdReplacement => {
    ehrMessageJsonString =
        ehrMessageJsonString.replaceAll(messageIdReplacement.oldMessageId, messageIdReplacement.newMessageId);
  });

  return JSON.parse(ehrMessageJsonString);
}

export const createNewMessageIds = async oldMessageIds => {
  const messageIdReplacements = oldMessageIds.map((oldMessageId) => {
    return {
      oldMessageId: oldMessageId,
      newMessageId: uuidv4().toUpperCase()
    }
  });

  await createMessageIdReplacements(messageIdReplacements);
  logInfo(`Created new Message ID's for EHR Core and ${messageIdReplacements.length - 1} fragment(s)`);
  return messageIdReplacements;
};

export const getNewMessageIdForOldMessageId = (oldMessageId, messageIdReplacements) => {
  return messageIdReplacements
    .find(messageIdReplacement => messageIdReplacement.oldMessageId === oldMessageId)
    .newMessageId;
}