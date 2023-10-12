import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { logInfo } from '../../middleware/logging';
import {
  DownloadError,
  FragmentMessageIdReplacementRecordNotFoundError,
  MessageIdUpdateError,
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

// TODO PRMT-4074 REMOVE THIS
// const replaceMessageIdInObject = (ehrMessage, oldMessageId, newMessageId) => {
//   // helper func to replace messageIds in an EHR core or EHR fragment parsed as a JS object
//   return JSON.parse(JSON.stringify(ehrMessage).replaceAll(oldMessageId, newMessageId));
// };

export const replaceMessageIdsInObject = (ehrMessage, messageIdsWithReplacements) => {
  try {
    const stringifiedEhrMessage = JSON.stringify(ehrMessage)

    messageIdsWithReplacements.forEach(messageIdWithReplacement =>
      stringifiedEhrMessage.replaceAll(messageIdWithReplacement.oldMessageId, messageIdWithReplacement.newMessageId)
    );

    return JSON.parse(stringifiedEhrMessage);
  } catch (error) {
    throw new MessageIdUpdateError(error);
  }
}

// TODO PRMT-4074 REMOVE THIS
// export const updateMessageIdForEhrCore = async ehrCore => {
//   try {
//     const messageId = await parseMessageId(ehrCore);
//     const newMessageId = uuidv4().toUpperCase();
//     const ehrCoreWithUpdatedMessageId = replaceMessageIdInObject(ehrCore, messageId, newMessageId);
//
//     return {
//       newMessageId, ehrCoreWithUpdatedMessageId
//     }
//   } catch (error) {
//     throw new MessageIdUpdateError(error);
//   }
// };

export const createNewMessageIds = async oldMessageIds => {
  const messageIdReplacements = oldMessageIds.map((oldMessageId) => {
    return {
      oldMessageId: oldMessageId,
      newMessageId: uuidv4().toUpperCase()
    }
  });

  await createMessageIdReplacements(messageIdReplacements);
  logInfo(`Created new message ID(s) for EHR core & ${messageIdReplacements.length - 1} fragments`);
  return messageIdReplacements;
};

export const getNewMessageIdForOldMessageId = (oldMessageId, messageIdReplacements) => {
  return messageIdReplacements
    .find(messageIdReplacement => messageIdReplacement.oldMessageId === oldMessageId)
    .newMessageId;
}

// export const updateReferencedFragmentIds = async (ehrMessage, messageIdReplacements) => {
//   /*
//    This function take care of updating the message ids of referenced fragments.
//    It works for both an EHR core or a nested fragment message.
//    It doesn't update the main message id, which is to be taken care by other functions.
//    */
//
//   // TODO PRMT-4074 remove this
//   // try {
//   //   const fragmentMessageIds = await extractReferencedFragmentMessageIds(ehrMessage);
//   //
//   //   for (let oldMessageId of fragmentMessageIds) {
//   //     const newMessageId = await getNewMessageIdByOldMessageId(oldMessageId);
//   //     ehrMessage = replaceMessageIdInObject(ehrMessage, oldMessageId, newMessageId);
//   //   }
//   // } catch (error) {
//   //   throw new MessageIdUpdateError(error);
//   // }
//
//   try {
//     ehrMessage = replaceMessageIdsInObject(ehrMessage, messageIdReplacements)
//   } catch (error) {
//     throw new MessageIdUpdateError(error);
//   }
//
//   return ehrMessage;
// };

// export const updateFragmentMessageIds = (fragment, oldMessageId, messageIdReplacements) => {
//   const newMessageId = messageIdReplacements.find(
//     messageIdReplacement => messageIdReplacement.oldMessageId === oldMessageId
//   )
//     .newMessageId;
//
//   const fragmentWithUpdatedMIDAndReferences =  replaceMessageIdsInObject(fragment, messageIdReplacements)
//   return {
//     newMessageId,
//     message: fragmentWithUpdatedMIDAndReferences
//   };
// }

// export const updateMessageIdForFragment = async (fragment) => {
//   const messageId  = await parseMessageId(fragment);
//   const newMessageId = await getNewMessageIdByOldMessageId(messageId);
//   const updatedFragment = JSON.parse(JSON.stringify(fragment).replaceAll(messageId, newMessageId));
//
//   return {
//     updatedFragment,
//     newMessageId
//   };
// };
