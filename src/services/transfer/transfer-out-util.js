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

const replaceMessageIdInObject = (ehrMessage, oldMessageId, newMessageId) => {
  // helper func to replace messageIds in an EHR core or EHR fragment parsed as a JS object

  return JSON.parse(JSON.stringify(ehrMessage).replaceAll(oldMessageId, newMessageId));
};

export const updateMessageIdForEhrCore = async ehrCore => {
  try {
    const { messageId } = await extractEbXmlData(ehrCore.ebXML);
    const newMessageId = uuidv4().toUpperCase();

    return replaceMessageIdInObject(ehrCore, messageId, newMessageId);
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }
};

export const createNewMessageIdsForAllFragments = async fragmentMessageIds => {
  for (let oldMessageId of fragmentMessageIds) {
    const newMessageId = uuidv4().toUpperCase();
    await createMessageIdReplacement(oldMessageId, newMessageId);
  }
};

export const updateReferencedFragmentIds = async ehrMessage => {
  /*
   This function take care of updating the message ids of referenced fragments.
   It works for both an EHR core or a nested fragment message.
   It doesn't update the main message id, which is to be taken care by other functions.
   */

  try {
    const fragmentMessageIds = await extractReferencedFragmentMessageIds(ehrMessage.ebXML);

    for (let oldMessageId of fragmentMessageIds) {
      const newMessageId = await getNewMessageIdByOldMessageId(oldMessageId);
      ehrMessage = replaceMessageIdInObject(ehrMessage, oldMessageId, newMessageId);
    }
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }

  return ehrMessage;
};

export const updateAllFragmentsMessageIds = async fragments => {
  const fragmentsWithUpdatedMessageIds = {};

  for (let fragment of fragments) {
    let { updatedFragment, newMessageId } = await updateMessageIdForMessageFragment(fragment);
    updatedFragment = await updateReferencedFragmentIds(updatedFragment);
    fragmentsWithUpdatedMessageIds[newMessageId] = updatedFragment;
  }
  logInfo('Successfully updated the message ids in all fragments');

  return fragmentsWithUpdatedMessageIds;
};

export const updateMessageIdForMessageFragment = async fragment => {
  const { messageId } = await extractEbXmlData(fragment.ebXML);
  const newMessageId = await getNewMessageIdByOldMessageId(messageId);
  const updatedFragment = JSON.parse(JSON.stringify(fragment).replaceAll(messageId, newMessageId));
  return {
    updatedFragment,
    newMessageId
  };
};
