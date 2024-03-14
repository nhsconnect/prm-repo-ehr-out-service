import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { logInfo } from '../../middleware/logging';
import { DownloadError, StatusUpdateError } from '../../errors/errors';
import { getPdsOdsCode } from '../gp2gp/pds-retrieval-request';
import { updateOutboundConversationStatus } from '../database/dynamodb/outbound-conversation-repository';
import { storeOutboundMessageIds } from '../database/dynamodb/store-outbound-message-ids';
import { updateFragmentStatusInDb } from '../database/dynamodb/ehr-fragment-repository';

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

export const updateConversationStatus = async (
  conversationId,
  status,
  failureReason = null,
  logMessage
) => {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Updating conversation with status: ${status}`);

  await updateOutboundConversationStatus(conversationId, status, failureReason)
    .then()
    .catch(error => {
      throw new StatusUpdateError(error);
    });

  if (logMessage) logInfo(logMessage);
};

export const updateFragmentStatus = async (
  inboundConversationId,
  inboundMessageId,
  status,
  failureReason = null
) => {
  setCurrentSpanAttributes({ conversationId: inboundConversationId, messageId: inboundMessageId });
  logInfo(`Updating fragment with status: ${status}`);

  await updateFragmentStatusInDb(inboundConversationId, inboundMessageId, status, failureReason)
    .then()
    .catch(error => {
      throw new StatusUpdateError(error);
    });

  logInfo(`Updated fragment status to: ${status}`);
};

export const replaceMessageIdsInObject = (ehrMessage, messageIdReplacements) => {
  let ehrMessageJsonString = JSON.stringify(ehrMessage);

  messageIdReplacements.forEach(messageIdReplacement => {
    ehrMessageJsonString = ehrMessageJsonString.replaceAll(
      messageIdReplacement.oldMessageId,
      messageIdReplacement.newMessageId
    );
  });

  return JSON.parse(ehrMessageJsonString);
};

export const createAndStoreOutboundMessageIds = async (oldMessageIds, inboundConversationId) => {
  const messageIdReplacements = oldMessageIds.map(oldMessageId => {
    return {
      oldMessageId,
      newMessageId: uuidv4().toUpperCase()
    };
  });

  await storeOutboundMessageIds(messageIdReplacements, inboundConversationId);

  logInfo(
    `Created new Message ID's for EHR Core and ${messageIdReplacements.length - 1} fragment(s)`
  );
  return messageIdReplacements;
};

export const getNewMessageIdForOldMessageId = (oldMessageId, messageIdReplacements) => {
  return messageIdReplacements.find(
    messageIdReplacement => messageIdReplacement.oldMessageId === oldMessageId
  ).newMessageId;
};
