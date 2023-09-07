import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { logInfo } from '../../middleware/logging';
import { DownloadError, MessageIdUpdateError, StatusUpdateError } from '../../errors/errors';
import { getPdsOdsCode } from '../gp2gp/pds-retrieval-request';
import { updateRegistrationRequestStatus } from '../database/registration-request-repository';
import { updateMessageFragmentRecordStatus } from '../database/message-fragment-repository';
import { getNewMessageIdByOldMessageId } from '../database/message-id-replacement-repository';
import { createMessageIdReplacement } from '../database/create-message-id-replacement';
import { extractReferencedFragmentMessageIds, parseMessageId } from "../parser/parsing-utilities";

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

const replaceMessageIdInObject = (ehrMessage, oldMessageId, newMessageId) => {
  // helper func to replace messageIds in an EHR core or EHR fragment parsed as a JS object

  return JSON.parse(JSON.stringify(ehrMessage).replaceAll(oldMessageId, newMessageId));
};

export const updateMessageIdForEhrCore = async ehrCore => {
  try {
    const messageId = await parseMessageId(ehrCore);
    const newMessageId = uuidv4().toUpperCase();
    const ehrCoreWithUpdatedMessageId = replaceMessageIdInObject(ehrCore, messageId, newMessageId);

    return {
      newMessageId, ehrCoreWithUpdatedMessageId
    }
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
    const fragmentMessageIds = await extractReferencedFragmentMessageIds(ehrMessage);

    for (let oldMessageId of fragmentMessageIds) {
      const newMessageId = await getNewMessageIdByOldMessageId(oldMessageId);
      ehrMessage = replaceMessageIdInObject(ehrMessage, oldMessageId, newMessageId);
    }
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }

  return ehrMessage;
};

export const updateFragmentMessageId = async fragment => {
  const { updatedFragment, newMessageId } = await updateMessageIdForFragment(fragment);
  const fragmentWithUpdatedMIDAndReferences = await updateReferencedFragmentIds(updatedFragment);
  return {
    newMessageId,
    message: fragmentWithUpdatedMIDAndReferences
  };
}

export const updateMessageIdForFragment = async (fragment) => {
  const messageId  = await parseMessageId(fragment);
  const newMessageId = await getNewMessageIdByOldMessageId(messageId);
  const updatedFragment = JSON.parse(JSON.stringify(fragment).replaceAll(messageId, newMessageId));

  return {
    updatedFragment,
    newMessageId
  };
};
