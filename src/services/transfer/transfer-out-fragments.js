import {
  getFragment,
  getFragmentConversationAndMessageIdsFromEhrRepo
} from '../ehr-repo/get-fragment';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { replaceMessageIdsInObject, updateFragmentStatus } from './transfer-out-util';
import { sendFragment } from '../gp2gp/send-fragment';
import { logError, logInfo } from '../../middleware/logging';
import { config } from '../../config';
// import { Status } from '../../models/message-fragment';
import { DownloadError, PresignedUrlNotFoundError } from '../../errors/errors';
import {
  getAllFragmentIdsToBeSent,
  getAllMessageIdPairs
} from '../database/dynamodb/ehr-fragment-repository';
import { FragmentStatus } from '../../constants/enums';
// import { createFragmentDbRecord } from "../database/create-fragment-db-record";

export async function transferOutFragmentsForNewContinueRequest({
  conversationId,
  nhsNumber,
  odsCode
}) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Initiated the EHR Fragment transfer.`);
  const { inboundConversationId, messageIds } =
    await getFragmentConversationAndMessageIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved all fragment Message IDs for transfer.');

  const messageIdsWithReplacements = await getAllMessageIdPairs(messageIds, inboundConversationId);
  // const newMessageIds = messageIdsWithReplacements.map(replacement => replacement.newMessageId);
  // const inboundMessageIds = messageIdsWithReplacements.map(replacement => replacement.newMessageId);
  //
  // for (const newMessageId of newMessageIds) {
  //   await createFragmentDbRecord(newMessageId, conversationId);
  // }

  await getAndSendMessageFragments(
    messageIdsWithReplacements,
    inboundConversationId,
    conversationId,
    odsCode
  );
}

export async function transferOutFragmentsForRetriedContinueRequest({
  conversationId,
  nhsNumber,
  odsCode
}) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Retrying the EHR Fragment transfer.`);
  const { inboundConversationId, messageIds } =
    await getFragmentConversationAndMessageIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved all fragment Message IDs for transfer.');

  const messageIdsWithReplacements = await getAllMessageIdPairs(messageIds, inboundConversationId);
  const messageIdsWithReplacementsEligibleForSending = await getAllFragmentIdsToBeSent(inboundConversationId);

  logInfo(
    `Found ${messageIdsWithReplacementsEligibleForSending.length} Message ID replacements eligible to be sent.`
  );

  await getAndSendMessageFragments(
    messageIdsWithReplacementsEligibleForSending,
    inboundConversationId,
    conversationId,
    odsCode
  );
}

const getAndSendMessageFragments = async (
  messageIdsWithReplacements,
  inboundConversationId,
  conversationId,
  odsCode
) => {
  let count = 0;

  for (const messageIdWithReplacement of messageIdsWithReplacements) {
    try {
      const { oldMessageId, newMessageId } = messageIdWithReplacement;

      let fragment = await getFragment(inboundConversationId, oldMessageId);
      fragment = replaceMessageIdsInObject(fragment, messageIdsWithReplacements);

      await sendFragment(conversationId, odsCode, fragment, newMessageId);

      logInfo(
        `Fragment ${++count} of ${
          messageIdsWithReplacements.length
        } sent to the GP2GP Messenger - with old Message ID ${oldMessageId}, and new Message ID ${newMessageId}.`
      );

      if (config.fragmentTransferRateLimitTimeoutMilliseconds)
        await new Promise(executor =>
          setTimeout(executor, config.fragmentTransferRateLimitTimeoutMilliseconds)
        );
    } catch (error) {
      await handleFragmentTransferError(
        error,
        inboundConversationId,
        messageIdWithReplacement.oldMessageId
      );
      throw error;
    }
  }

  logInfo(`All fragments have been successfully sent to GP2GP Messenger.`);
};

const handleFragmentTransferError = async (error, inboundConversationId, inboundMessageId) => {
  // TODO: change updateFragmentStatus to store an extra field of different error reason
  switch (true) {
    case error instanceof PresignedUrlNotFoundError:
      await updateFragmentStatus(
        inboundConversationId,
        inboundMessageId,
        FragmentStatus.OUTBOUND_FAILED
      );
      break;
    case error instanceof DownloadError:
      await updateFragmentStatus(
        inboundConversationId,
        inboundMessageId,
        FragmentStatus.OUTBOUND_FAILED
      );
      break;
    default:
      await updateFragmentStatus(
        inboundConversationId,
        inboundMessageId,
        FragmentStatus.OUTBOUND_FAILED
      );
      logError('Fragment transfer request failed', error);
  }
};
