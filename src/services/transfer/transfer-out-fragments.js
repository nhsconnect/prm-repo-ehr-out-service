import { getFragment, retrieveIdsFromEhrRepo } from '../ehr-repo/get-fragment';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { updateFragmentMessageId } from './transfer-out-util';
import { sendFragment } from '../gp2gp/send-fragment';
import { logInfo } from '../../middleware/logging';
import { config } from '../../config';

export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Initiated the EHR Fragment transfer for Inbound Conversation ID ${conversationId}.`);
  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved Inbound Conversation ID and all Message IDs for transfer.');
  let count = 0;

  for (const messageId of messageIds) {
    const fragment = await getFragment(conversationIdFromEhrIn, messageId);
    const { newMessageId, message } = await updateFragmentMessageId(fragment);
    await sendFragment(conversationId, odsCode, message, newMessageId);
    logInfo(`Fragment ${++count} of ${messageIds.length} sent to the GP2GP Messenger - with old Message ID ${messageId}, and new Message ID ${newMessageId}.`);

    if(config.rateLimitTimeoutMilliseconds)
      await new Promise(executor => setTimeout(executor, config.rateLimitTimeoutMilliseconds));
  }

  logInfo(`All fragments have been successfully sent to GP2GP Messenger, Inbound Conversation ID: ${conversationId}`);
}