import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { setCurrentSpanAttributes } from '../../config/tracing';
import { logInfo } from '../../middleware/logging';
import { DownloadError, MessageIdUpdateError, StatusUpdateError } from '../../errors/errors';
import { getPdsOdsCode } from '../gp2gp/pds-retrieval-request';
import { updateRegistrationRequestStatus } from '../database/registration-request-repository';
import { updateMessageFragmentStatus } from '../database/message-fragment-repository';
import {
  extractEbXmlData,
  extractReferencedFragmentMessageIds
} from '../parser/extract-eb-xml-data';
import { getNewMessageIdByOldMessageId } from '../database/message-id-replacement-repository';
import { createMessageIdReplacement } from '../database/create-message-id-replacement';

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

export const updateFragmentStatus = async (conversationId, messageId, status, logMessage) => {
  setCurrentSpanAttributes({ conversationId, messageId });
  logInfo(`Updating fragment with status: ${status}`);

  await updateMessageFragmentStatus(messageId, status)
    .then()
    .catch(error => {
      throw new StatusUpdateError(error);
    });

  if (logMessage) logInfo(logMessage);
};

export const updateCoreMessageIdAndReferencedFragmentIds = async ehrCore => {
  const updatedEhrCore = updateMessageIdForEhrCore(ehrCore);
  return updateReferencedFragmentIds(updatedEhrCore);
};

export const updateMessageIdForEhrCore = async ehrCore => {
  try {
    const { messageId } = await extractEbXmlData(JSON.parse(ehrCore).ebXML);
    const newMessageId = uuidv4().toUpperCase();

    return ehrCore.replaceAll(messageId, newMessageId);
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }
};

export const updateReferencedFragmentIds = async ehrCore => {
  let updatedEhrCore = ehrCore;
  const messageIdsDict = {};

  try {
    const fragmentMessageIds = await extractReferencedFragmentMessageIds(JSON.parse(ehrCore).ebXML);

    fragmentMessageIds.forEach(oldMessageId => {
      const newMessageId = uuidv4().toUpperCase();

      updatedEhrCore = updatedEhrCore.replace(oldMessageId, newMessageId);
      messageIdsDict[oldMessageId] = newMessageId;
    });
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }

  for (let [oldMessageId, newMessageId] of Object.entries(messageIdsDict)) {
    await createMessageIdReplacement(oldMessageId, newMessageId);
  }

  return updatedEhrCore;
};

export const updateMessageIdForMessageFragment = async fragment => {
  const { messageId } = await extractEbXmlData(JSON.parse(fragment).ebXML);
  const newMessageId = getNewMessageIdByOldMessageId(messageId);
  return fragment.replace(messageId, newMessageId);
};
