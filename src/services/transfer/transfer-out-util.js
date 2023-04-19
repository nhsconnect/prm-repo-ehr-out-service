import axios from 'axios';
import { logInfo } from '../../middleware/logging';
import { DownloadError, StatusUpdateError } from '../../errors/errors';
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
  const { messageId } = await extractEbXmlData(JSON.parse(ehrCore).ebXML);
  const newMessageId = uuidv4();

  await extractReferencedFragmentMessageIds(JSON.parse(ehrCore).ebXML);

  return ehrCore.replaceAll(messageId, newMessageId);
};

export const updateReferencedFragmentIds = async ehrCore => {
  const fragmentMessageIds = await extractReferencedFragmentMessageIds(JSON.parse(ehrCore).ebXML);

  const messageIdsDict = {};
  let updatedEhrCore = ehrCore;

  fragmentMessageIds.forEach(oldMessageId => {
    const newMessageId = uuidv4();

    updatedEhrCore = updatedEhrCore.replace(oldMessageId, newMessageId);
    messageIdsDict[oldMessageId] = newMessageId;
  });

  // TODO: store the old & new message id pairs in database
  // for (let [oldMessageId, newMessageId] of Object.entries(messageIdsDict)) {
  //   doSomething(oldMessageId, newMessageId)
  // }

  return updatedEhrCore;
};

export const updateMessageIdForMessageFragment = () => {};
