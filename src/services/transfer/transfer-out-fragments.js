import { logError, logInfo, logWarning } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import {getAllFragmentsWithMessageIdsFromRepo, getFragment, retrieveIdsFromEhrRepo} from '../ehr-repo/get-fragments';
import { sendFragment } from '../gp2gp/send-fragment';
import { Status } from '../../models/message-fragment';
import {updateFragmentStatus, updateAllFragmentsMessageIds, updateFragmentMessageId} from './transfer-out-util';
import { getMessageFragmentRecordByMessageId } from '../database/message-fragment-repository';
import { createFragmentDbRecord } from '../database/create-fragment-db-record';

// TEST CASES:
//    SUCCESS:
//        GIVEN A VALID CONVERSATION ID, NHS NUMBER AND ODS CODE
//        WHEN TRANSFER OUT FRAGMENTS IS CALLED
//        THEN EXPECT LOG INFO TO BE CALLED WITH `FRAGMENT TRANSFER COMPLETED`.
//          MOCKS: retrieveIdsFromEhrRepo, getFragment, updateFragmentMessageId, sendFragment

export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('Start EHR fragment transfer');

  // const fragmentsWithMessageIds = await getAllFragmentsWithMessageIdsFromRepo(nhsNumber);

  logInfo('Getting ehrIn conversation ID and message ID from EHR repo');
  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);

  const promises = messageIds.map(messageId => {
    const fragment = getFragment(conversationIdFromEhrIn, messageId);
    // convert ID to the new ID
    const { newMessageId, message } = updateFragmentMessageId(fragment);
    return sendFragment(conversationId, odsCode, message, newMessageId);
  });

  Promise.all(promises)
    .then(() => logInfo('Fragment transfer completed'))
    .catch(() => logError('Failure while attempting to transfer fragments from EHR repo'));
}

// export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
//   setCurrentSpanAttributes({ conversationId });
//   logInfo('Start EHR fragment transfer');
//
//   const fragmentsWithMessageIds = await getAllFragmentsWithMessageIdsFromRepo(nhsNumber);
//   const fragments = Object.values(fragmentsWithMessageIds);
//   const fragmentsWithNewMessageIds = await updateAllFragmentsMessageIds(fragments);
//
//   await sendAllFragments(fragmentsWithNewMessageIds, conversationId, odsCode);
//   logInfo('Fragment transfer completed');
// }

// const sendAllFragments = (fragmentsWithMessageIds, conversationId, odsCode) => {
//   const promises = [];
//   for (let messageId in fragmentsWithMessageIds) {
//     const fragment = fragmentsWithMessageIds[messageId];
//     promises.push(sendOneFragment(conversationId, odsCode, fragment, messageId));
//   }
//
//   return Promise.all(promises);
// };



// // ORIGINAL LOGIC
// const sendOneFragment = async (conversationId, odsCode, fragment, messageId) => {
//   logInfo(`Start sending fragment with message id: ${messageId}`);
//
//   if (await hasFragmentBeenSent(messageId)) {
//     return;
//   }
//   logInfo(`Checked that fragment with message id: ${messageId} is not sent yet`);
//
//   logInfo(`Creating a record for fragment in database, message id: ${messageId}`);
//
//   try {
//     await createMessageFragment(messageId, conversationId);
//   } catch (error) {
//     logError(`Got error while trying to create record for message id: ${messageId}`, error);
//   }
//
//   logInfo(`Sending message fragment of id ${messageId}...`);
//   return sendFragment(conversationId, odsCode, fragment, messageId)
//     .then(() => updateFragmentStatus(conversationId, messageId, Status.SENT_FRAGMENT))
//     .catch(async (error) => {
//       logError(`Message fragment transfer failed due to error: ${error}`);
//       await updateFragmentStatus(conversationId, messageId, Status.FRAGMENT_SENDING_FAILED);
//       throw error;
//     });
// };