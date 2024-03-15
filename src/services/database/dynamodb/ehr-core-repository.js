import { EhrTransferTracker } from './dynamo-ehr-transfer-tracker';
import { isCore } from '../../../models/core';
import { logInfo } from '../../../middleware/logging';

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
