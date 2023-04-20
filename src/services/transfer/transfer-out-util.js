import axios from 'axios';
import { logInfo } from '../../middleware/logging';
import {DownloadError, MessageIdUpdateError, StatusUpdateError} from '../../errors/errors';
import { getPdsOdsCode } from '../gp2gp/pds-retrieval-request';
import { updateRegistrationRequestStatus } from '../database/registration-request-repository';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { updateMessageFragmentStatus } from '../database/message-fragment-repository';
import {
  extractEbXmlData,
  extractReferencedFragmentMessageIds
} from '../parser/extract-eb-xml-data';
import { v4 as uuidv4 } from 'uuid';

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

export const updateCoreMessageIdAndReferencedFragmentIds = async (ehrCore) => {
  const updatedEhrCore = updateMessageIdForEhrCore(ehrCore);
  return updateReferencedFragmentIds(updatedEhrCore);
};

export const updateMessageIdForEhrCore = async ehrCore => {
  try {
    const {messageId} = await extractEbXmlData(JSON.parse(ehrCore).ebXML);
    const newMessageId = uuidv4();

    return ehrCore.replaceAll(messageId, newMessageId);
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }
};

export const updateReferencedFragmentIds = async ehrCore => {
  let updatedEhrCore = ehrCore;

  try {
    const fragmentMessageIds = await extractReferencedFragmentMessageIds(JSON.parse(ehrCore).ebXML);

    const messageIdsDict = {};

    fragmentMessageIds.forEach(oldMessageId => {
      const newMessageId = uuidv4();

      updatedEhrCore = updatedEhrCore.replace(oldMessageId, newMessageId);
      messageIdsDict[oldMessageId] = newMessageId;
    });
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }

  // TODO: store the old & new message id pairs in database
  // for (let [oldMessageId, newMessageId] of Object.entries(messageIdsDict)) {
  //   doSomething(oldMessageId, newMessageId)
  // }

  return updatedEhrCore;
};

export const updateMessageIdForMessageFragment = async (fragment) => {
  const { messageId } = await extractEbXmlData(JSON.parse(fragment).ebXML);

  // TODO retrieve the new message ID from the database that was generated when handling the associated EHR core


};
