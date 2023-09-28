import { getFragment, getMessageIdsFromEhrRepo } from '../ehr-repo/get-fragment';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { replaceMessageIdsInObject } from './transfer-out-util';
import { sendFragment } from '../gp2gp/send-fragment';
import { logInfo } from '../../middleware/logging';
import { config } from '../../config';
import { getAllMessageIdsWithReplacementsByOldMessageIds } from "../database/message-id-replacement-repository";
import { getAllMessageFragmentRecordsByMessageIds } from "../database/message-fragment-repository";
import { Status } from "../../models/message-fragment";

export async function transferOutFragmentsForNewContinueRequest({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Initiated the EHR Fragment transfer for Inbound Conversation ID ${conversationId}.`);
  const { conversationIdFromEhrIn, messageIds } = await getMessageIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved Inbound Conversation ID and all Message IDs for transfer.');

  // returns an object with the inbound and outbound message IDs paired together
  const messageIdsWithReplacements = await getAllMessageIdsWithReplacementsByOldMessageIds(messageIds);

  await getAndSendMessageFragments(messageIdsWithReplacements, conversationIdFromEhrIn, conversationId, odsCode);
}

export async function transferOutFragmentsForRetriedContinueRequest({ conversationId, nhsNumber, odsCode }) {
  setCurrentSpanAttributes({ conversationId });
  logInfo(`Retrying the EHR Fragment transfer for Inbound Conversation ID ${conversationId}.`);
  const { conversationIdFromEhrIn, messageIds } = await getMessageIdsFromEhrRepo(nhsNumber);
  logInfo('Retrieved Inbound Conversation ID and all Message IDs for transfer.');

  // returns an object with the inbound and outbound message IDs paired together
  const messageIdsWithReplacements = await getAllMessageIdsWithReplacementsByOldMessageIds(messageIds);

  const messageIdsOfFragmentsEligibleForSending = await getMessageIdsOfFragmentsEligibleForSending(messageIdsWithReplacements);

  const messageIdsWithReplacementsEligibleForSending = messageIdsWithReplacements.filter(messageIdWithReplacement =>
    messageIdsOfFragmentsEligibleForSending.contains(messageIdWithReplacement.newMessageId));

  await getAndSendMessageFragments(messageIdsWithReplacementsEligibleForSending, conversationIdFromEhrIn, conversationId, odsCode);
}

const getAndSendMessageFragments = async (messageIdsWithReplacements, conversationIdFromEhrIn, conversationId, odsCode) => {
  let count = 0;

  for (const messageIdWithReplacement of messageIdsWithReplacements) {
    const { oldMessageId, newMessageId} = messageIdWithReplacement;

    let fragment = await getFragment(conversationIdFromEhrIn, oldMessageId);
    fragment = replaceMessageIdsInObject(fragment, messageIdsWithReplacements);
    await sendFragment(conversationId, odsCode, fragment, newMessageId);
    logInfo(`Fragment ${++count} of ${messageIdsWithReplacements.length} sent to the GP2GP Messenger - with old Message ID ${messageIdWithReplacement}, and new Message ID ${newMessageId}.`);

    if (config.fragmentTransferRateLimitTimeoutMilliseconds)
      await new Promise(executor => setTimeout(executor, config.fragmentTransferRateLimitTimeoutMilliseconds));
  }

  logInfo(`All fragments have been successfully sent to GP2GP Messenger, Inbound Conversation ID: ${conversationId}`);
}

const getMessageIdsOfFragmentsEligibleForSending = async (messageIdsWithReplacements) => {
  const newMessageIds = messageIdsWithReplacements.map(messageIdWithReplacement => messageIdWithReplacement.newMessageId);
  const messageFragments = await getAllMessageFragmentRecordsByMessageIds(newMessageIds);
  return messageFragments.map(messageFragment => {
    if (isFragmentIsEligibleToBeSent(messageFragment)) {
      return messageFragment.messageId;
    }
  });
}

const isFragmentIsEligibleToBeSent = (messageFragment) => {
  switch (messageFragment.status) {
    case Status.SENT_FRAGMENT:
    case Status.INCORRECT_ODS_CODE:
    case Status.MISSING_FROM_REPO:
    case Status.FRAGMENT_SENDING_FAILED:
      return false;
    default:
      return true;
  }
}
