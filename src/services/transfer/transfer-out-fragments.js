import { getFragment, retrieveIdsFromEhrRepo } from '../ehr-repo/get-fragments';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { updateFragmentMessageId } from './transfer-out-util';
import { logError, logInfo } from '../../middleware/logging';
import { sendFragment } from '../gp2gp/send-fragment';

export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });

  logInfo('Initiated EHR Fragment transfer.');

  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);

  logInfo('Retrieved Inbound Conversation ID and all Message IDs for transfer.');

  let count = 0;

  const transferPromises = messageIds.map(async messageId => {
    const fragment = await getFragment(conversationIdFromEhrIn, messageId);
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
