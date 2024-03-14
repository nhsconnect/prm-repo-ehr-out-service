// to replace below old files:
// create-fragment-db-record.js, message-fragment-repository.js, message-id-replacement-repository.js

import { logError, logInfo } from '../../../middleware/logging';
import { EhrTransferTracker } from './dynamo-ehr-transfer-tracker';
import { isCoreOrFragment } from '../../../models/core';
import { FragmentMessageIdReplacementRecordNotFoundError } from '../../../errors/errors';
import { buildFragmentUpdateParams, isFragment, isNotSentOut } from '../../../models/fragment';
import { FragmentStatus, RecordType } from '../../../constants/enums';
import { getUKTimestamp } from '../../time';
import { ACKNOWLEDGEMENT_TYPES } from '../../../constants/acknowledgement-types';

export const getAllMessageIdPairs = async (oldMessageIds, inboundConversationId) => {
  if (!inboundConversationId) {
    throw new Error('inboundConversationId cannot be empty');
  }
  const db = EhrTransferTracker.getInstance();
  const wholeRecord = await db.queryTableByInboundConversationId(inboundConversationId);
  const coreAndFragments = wholeRecord.filter(isCoreOrFragment);

  const messageIdReplacements = coreAndFragments.map(item => ({
    oldMessageId: item.InboundMessageId,
    newMessageId: item.OutboundMessageId
  }));

  verifyMessageIdReplacementWasFoundForEachMessageId(oldMessageIds, messageIdReplacements);

  logInfo(`Successfully retrieved ${coreAndFragments.length} message record(s).`);

  return messageIdReplacements;
};

export const updateFragmentStatusInDb = async (inboundConversationId, inboundMessageId, status) => {
  logInfo(`Updating message fragment status to ${status}`);

  const db = EhrTransferTracker.getInstance();
  const updateParams = buildFragmentUpdateParams(inboundConversationId, inboundMessageId, {
    TransferStatus: status
  });

  await db.updateSingleItem(updateParams);
  logInfo('Updated message fragment status has been stored');
};

export const getAllFragmentIdsToBeSent = async inboundConversationId => {
  const db = EhrTransferTracker.getInstance();
  const allFragments = await db.queryTableByInboundConversationId(
    inboundConversationId,
    RecordType.FRAGMENT
  );
  const eligibleRecords = allFragments.filter(isNotSentOut);
  logInfo(
    `Found ${eligibleRecords.length} eligible records, returning the Outbound Message ID(s).`
  );
  return eligibleRecords.map(fragment => ({
    oldMessageId: fragment.InboundMessageId,
    newMessageId: fragment.OutboundMessageId
  }));
};

const verifyMessageIdReplacementWasFoundForEachMessageId = (
  oldMessageIds,
  messageIdReplacements
) => {
  const lengthCorrect = messageIdReplacements.length === oldMessageIds.length;
  const allIdsMatch = messageIdReplacements.every(pair =>
    oldMessageIds.includes(pair.oldMessageId)
  );

  if (!lengthCorrect || !allIdsMatch) {
    throw new FragmentMessageIdReplacementRecordNotFoundError(
      oldMessageIds.length,
      messageIdReplacements.length
    );
  }
};

export const storeAcknowledgement = async (
  parsedAcknowledgementMessage,
  outboundConversationId
) => {
  try {
    const { acknowledgementTypeCode, acknowledgementDetail, messageRef } =
      parsedAcknowledgementMessage;
    const db = EhrTransferTracker.getInstance();
    const allRecords = await db.queryTableByOutboundConversationId(outboundConversationId);

    const relatedMessage = allRecords
      .filter(isFragment)
      .find(item => item?.OutboundMessageId?.toUpperCase() === messageRef?.toUpperCase());

    if (!relatedMessage) {
      logError(
        'Received an acknowledgement message that refers to unknown messageId. Will not proceed further.'
      );
      logError(`Details of said acknowledgement: ${JSON.stringify(parsedAcknowledgementMessage)}`);
      return;
    }

    const updateContent = {
      AcknowledgementReceivedAt: getUKTimestamp(),
      AcknowledgementTypeCode: acknowledgementTypeCode,
      AcknowledgementDetail: acknowledgementDetail ?? null
    };

    if (ACKNOWLEDGEMENT_TYPES.POSITIVE.includes(acknowledgementTypeCode)) {
      updateContent.TransferStatus = FragmentStatus.OUTBOUND_COMPLETE;
    } else if (ACKNOWLEDGEMENT_TYPES.NEGATIVE.includes(acknowledgementTypeCode)) {
      updateContent.TransferStatus = FragmentStatus.OUTBOUND_FAILED;
    }

    const updateParams = buildFragmentUpdateParams(
      relatedMessage.InboundConversationId,
      relatedMessage.InboundMessageId,
      updateContent
    );

    logInfo(`Storing acknowledgement related to outboundMessageId: ${messageRef}`);
    await db.updateSingleItem(updateParams);
    logInfo('Acknowledgement has been stored');
  } catch (e) {
    console.error(e);
    logError('Failed to store acknowledgement due to error', e);
  }
};
