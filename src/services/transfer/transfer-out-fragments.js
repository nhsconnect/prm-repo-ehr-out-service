import { logError, logInfo, logWarning } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { getAllFragmentsWithMessageIdsFromRepo } from '../ehr-repo/get-fragments';
import { sendFragment } from '../gp2gp/send-fragment';
import { Status } from '../../models/message-fragment';
import { updateFragmentStatus, updateAllFragmentsMessageIds } from './transfer-out-util';
import { getMessageFragmentStatusByMessageId } from '../database/message-fragment-repository';
import { createMessageFragment } from '../database/create-message-fragment';

export async function transferOutFragments({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo('Start EHR fragment transfer');

  const fragmentsWithMessageIds = await getAllFragmentsWithMessageIdsFromRepo(nhsNumber);
  const fragments = Object.values(fragmentsWithMessageIds);
  const fragmentsWithNewMessageIds = await updateAllFragmentsMessageIds(fragments);

  await sendAllFragments(fragmentsWithNewMessageIds, conversationId, odsCode);
  logInfo('Fragment transfer completed');
}

const sendAllFragments = (fragmentsWithMessageIds, conversationId, odsCode) => {
  const promises = [];
  for (let messageId in fragmentsWithMessageIds) {
    const fragment = fragmentsWithMessageIds[messageId];
    promises.push(sendOneFragment(conversationId, odsCode, fragment, messageId));
  }

  return Promise.all(promises);
};

const sendOneFragment = async (conversationId, odsCode, fragment, messageId) => {
  if (await hasFragmentBeenSent(messageId)) {
    return;
  }

  await createMessageFragment(messageId, conversationId);
  logInfo(`Sending message fragment of id ${messageId}...`);

  return sendFragment(conversationId, odsCode, fragment, messageId)
    .then(() => updateFragmentStatus(conversationId, messageId, Status.SENT_FRAGMENT))
    .catch(async error => {
      logError(`Message fragment transfer failed due to error: ${error}`);
      await updateFragmentStatus(conversationId, messageId, Status.FRAGMENT_SENDING_FAILED);
      throw error;
    });
};

const hasFragmentBeenSent = async messageId => {
  const previousTransferOut = await getMessageFragmentStatusByMessageId(messageId);
  if (previousTransferOut?.status === Status.SENT_FRAGMENT) {
    logWarning(`EHR message FRAGMENT with message ID ${messageId} has already been sent`);
    return true;
  }
  return false;
};
