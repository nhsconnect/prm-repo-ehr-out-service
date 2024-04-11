import { EhrTransferTracker } from './dynamo-ehr-transfer-tracker';
import { buildCoreUpdateParams, isCore } from '../../../models/core';
import { logInfo } from '../../../middleware/logging';
import { CoreStatus } from "../../../constants/enums";

export const messageIdMatchOutboundCore = async (outboundConversationId, messageId) => {
  logInfo('Comparing the received messageId with outbound records');

  const db = EhrTransferTracker.getInstance();
  const queryResult = await db.queryTableByOutboundConversationId(outboundConversationId);
  const core = queryResult.filter(isCore)[0];

  logInfo(
    'Found core record for this conversation, will compare the messageId with the OutboundMessageId of core'
  );

  return messageId === core.OutboundMessageId;
};

export const updateCoreStatusInDb = async (
  inboundConversationId,
  inboundMessageId,
  status,
  failureReason = null
) => {
  const database = EhrTransferTracker.getInstance();
  const updateContent = {
    TransferStatus: status
  };

  if (status === CoreStatus.OUTBOUND_FAILED && failureReason) {
    updateContent.FailureReason = failureReason;
  }

  const updateParams = buildCoreUpdateParams(
      inboundConversationId,
      inboundMessageId,
      updateContent
  );

  await database.updateSingleItem(updateParams);
}