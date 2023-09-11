import { getFragment, retrieveIdsFromEhrRepo } from '../ehr-repo/get-fragment';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { updateFragmentMessageId } from './transfer-out-util';
import { logInfo } from '../../middleware/logging';
import { sendFragment } from '../gp2gp/send-fragment';
import * as os from "os";

export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('Initiated EHR Fragment transfer.');
  const { conversationIdFromEhrIn, messageIds } = await retrieveIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved Inbound Conversation ID and all Message IDs for transfer.');
  let count = 0;

  for (const messageId of messageIds) {
    const fragment = await getFragment(conversationIdFromEhrIn, messageId);
    const { newMessageId, message } = await updateFragmentMessageId(fragment);
    await sendFragment(conversationId, odsCode, message, newMessageId);
    logInfo(`Fragment ${++count} of ${messageIds.length} sent to the GP2GP Messenger - with old Message ID ${messageId}, and new Message ID ${newMessageId}.`);
    logInfo(`Memory dump: total memory of system ${(os.totalmem() / (1024 * 1024))} MiB, available memory ${(os.freemem() / (1024 * 1024))} MiB remaining.`);
  }

  logInfo(`All fragments have been successfully sent to GP2GP Messenger, Inbound Conversation ID: ${conversationId}`);
}