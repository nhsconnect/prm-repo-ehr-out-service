import { getFragment, getMessageIdsFromEhrRepo } from '../ehr-repo/get-fragment';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { replaceMessageIdsInObject, updateFragmentStatus } from './transfer-out-util';
import { sendFragment } from '../gp2gp/send-fragment';
import { logError, logInfo } from '../../middleware/logging';
import { config } from '../../config';
import { getAllMessageIdReplacements } from "../database/message-id-replacement-repository";
import { getAllMessageFragmentRecordsByMessageIds } from "../database/message-fragment-repository";
import { Status } from "../../models/message-fragment";
import { DownloadError, PresignedUrlNotFoundError } from "../../errors/errors";

export async function transferOutFragmentsForNewContinueRequest({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Initiated the EHR Fragment transfer.`);
  const { conversationIdFromEhrIn, messageIds } = await getMessageIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved all fragment Message IDs for transfer.');

  // returns an object with the inbound and outbound message IDs paired together
  const messageIdsWithReplacements = await getAllMessageIdReplacements(messageIds);

  await getAndSendMessageFragments(messageIdsWithReplacements, conversationIdFromEhrIn, conversationId, odsCode);
}

export async function transferOutFragmentsForRetriedContinueRequest({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Retrying the EHR Fragment transfer.`);
  const { conversationIdFromEhrIn, messageIds } = await getMessageIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved all fragment Message IDs for transfer.');

  // returns an object with the inbound and outbound message IDs paired together
  const messageIdsWithReplacements = await getAllMessageIdReplacements(messageIds);

  const messageIdsOfFragmentsEligibleForSending = await getMessageIdsOfFragmentsEligibleForSending(messageIdsWithReplacements);

  const messageIdsWithReplacementsEligibleForSending = messageIdsWithReplacements.filter(messageIdWithReplacement =>
    messageIdsOfFragmentsEligibleForSending.includes(messageIdWithReplacement.newMessageId));

  await getAndSendMessageFragments(messageIdsWithReplacementsEligibleForSending, conversationIdFromEhrIn, conversationId, odsCode);
}

const getAndSendMessageFragments = async (messageIdsWithReplacements, conversationIdFromEhrIn, conversationId, odsCode) => {
    let count = 0;

    for (const messageIdWithReplacement of messageIdsWithReplacements) {
      try {
        const {oldMessageId, newMessageId} = messageIdWithReplacement;
        let fragment = await getFragment(conversationIdFromEhrIn, oldMessageId);
        fragment = replaceMessageIdsInObject(fragment, messageIdsWithReplacements);

        await sendFragment(conversationId, odsCode, fragment, newMessageId);

        logInfo(`Fragment ${++count} of ${messageIdsWithReplacements.length} sent to the GP2GP Messenger - with old Message ID ${oldMessageId}, and new Message ID ${newMessageId}.`);

        if (config.fragmentTransferRateLimitTimeoutMilliseconds)
          await new Promise(executor => setTimeout(executor, config.fragmentTransferRateLimitTimeoutMilliseconds));
      } catch (error) {
        await handleFragmentTransferError(error, conversationId, messageIdWithReplacement.newMessageId);
        throw error;
      }
    }
    logInfo(`All fragments have been successfully sent to GP2GP Messenger.`);
}

const getMessageIdsOfFragmentsEligibleForSending = async (messageIdsWithReplacements) => {
  const newMessageIds = messageIdsWithReplacements.map(messageIdWithReplacement => messageIdWithReplacement.newMessageId);
  const messageFragmentRecords = await getAllMessageFragmentRecordsByMessageIds(newMessageIds);

  const messageIdsOfFragmentsEligibleForSending = newMessageIds.filter(messageId => {
    const messageFragmentRecord = messageFragmentRecords.find(
      messageFragmentRecord => messageFragmentRecord.messageId === messageId);

    return isFragmentIsEligibleToBeSent(messageFragmentRecord);
  });

  logInfo(`Out of ${newMessageIds.length} message Ids, ` +
  `${newMessageIds.length - messageIdsOfFragmentsEligibleForSending.length} have already been sent. ` +
  `${messageIdsOfFragmentsEligibleForSending.length} are eligible to be sent`);

  return messageIdsOfFragmentsEligibleForSending;
}

const isFragmentIsEligibleToBeSent = (messageFragmentRecord) => {
  // if the fragment has no fragmentRecord, it is considered eligible for sending
  const fragmentStatus = messageFragmentRecord?.status;
  return !(fragmentStatus === Status.SENT_FRAGMENT || fragmentStatus === Status.MISSING_FROM_REPO);
}

const handleFragmentTransferError = async (error, conversationId, messageId) => {
  switch (true) {
    case error instanceof PresignedUrlNotFoundError:
      await updateFragmentStatus(conversationId, messageId, Status.MISSING_FROM_REPO);
      break;
    case error instanceof DownloadError:
      await updateFragmentStatus(conversationId, messageId, Status.DOWNLOAD_FAILED);
      break;
    // this will catch any miscellaneous errors
    default:
      await updateFragmentStatus(conversationId, messageId, Status.SENDING_FAILED);
      logError('Fragment transfer request failed', error);
  }
}
