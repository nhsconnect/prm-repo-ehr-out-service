import { getFragment, retrieveIdsFromEhrRepo } from '../ehr-repo/get-fragments';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { updateFragmentMessageId } from './transfer-out-util';
import { logError, logInfo } from '../../middleware/logging';
import { sendFragment } from '../gp2gp/send-fragment';

export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  let count = 0;

  logInfo('Initiated EHR Fragment transfer.');

  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);

  logInfo('Retrieved Inbound Conversation ID and all Message IDs for transfer.');

  const transferPromises = messageIds.map(async messageId => {
    // const fragment = await getFragment(conversationIdFromEhrIn, messageId);
    // const { newMessageId, message } = await updateFragmentMessageId(fragment);
    // const fragmentPromise= sendFragment(conversationId, odsCode, message, newMessageId);

    const fragment = await getFragment(conversationIdFromEhrIn, messageId).then();
    const { newMessageId, message } = await updateFragmentMessageId(fragment);
    const fragmentPromise= sendFragment(conversationId, odsCode, message, newMessageId);

    logInfo(
      `Fragment ${++count} of ${messageIds.length} sent to the GP2GP Messenger - with old Message ID ${messageId}, and new Message ID ${newMessageId}.`
    );

    return fragmentPromise;
  });

  await Promise.all(transferPromises)
    .then(() => logInfo('Fragment transfer completed.'))
    .catch(error => logError(`An error occurred while attempting to transfer the fragments from the EHR Repository - details ${error}.`));
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