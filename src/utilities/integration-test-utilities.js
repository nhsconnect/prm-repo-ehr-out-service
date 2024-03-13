import { getUKTimestamp } from '../services/time';
import { EhrTransferTracker } from '../services/database/dynamodb/dynamo-ehr-transfer-tracker';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ConversationStatus, CoreStatus, FragmentStatus, RecordType } from '../constants/enums';

export const IS_IN_LOCAL = process.env.NHS_ENVIRONMENT === 'local' || !process.env.NHS_ENVIRONMENT;

export const createInboundRecordForTest = async (
  conversationId,
  nhsNumber,
  coreMessageId,
  fragmentMessageIds = []
) => {
  // This method is only meant for testing purpose.
  // the inbound conversation record is supposed to be created by other service.

  if (!IS_IN_LOCAL) {
    throw new Error('Unexpected call to createConversationForTest method in non-local environment');
  }

  const timestamp = getUKTimestamp();
  const db = EhrTransferTracker.getInstance();

  const conversation = {
    InboundConversationId: conversationId,
    Layer: RecordType.CONVERSATION,
    NhsNumber: nhsNumber,
    CreatedAt: timestamp,
    UpdatedAt: timestamp,
    TransferStatus: ConversationStatus.INBOUND_COMPLETE
  };

  const core = {
    InboundConversationId: conversationId,
    Layer: RecordType.CORE,
    InboundMessageId: coreMessageId,
    CreatedAt: timestamp,
    UpdatedAt: timestamp,
    ReceivedAt: timestamp,
    TransferStatus: CoreStatus.INBOUND_COMPLETE
  };

  const fragments = fragmentMessageIds.map(fragmentId => ({
    InboundConversationId: conversationId,
    Layer: [RecordType.FRAGMENT, fragmentId].join('#'),
    InboundMessageId: fragmentId,
    ParentId: coreMessageId,
    CreatedAt: timestamp,
    UpdatedAt: timestamp,
    ReceivedAt: timestamp,
    TransferStatus: FragmentStatus.INBOUND_COMPLETE
  }));

  await db.writeItemsInTransaction([conversation, core, ...fragments]);
};

export const cleanupRecordsForTest = async conversationId => {
  // This method is only meant for testing purpose

  if (!IS_IN_LOCAL) {
    throw new Error('Unexpected call to cleanupRecordsForTest method in non-local environment');
  }

  const db = EhrTransferTracker.getInstance();
  const records = await db.queryTableByInboundConversationId(conversationId, RecordType.ALL, true);
  const deleteCommand = new TransactWriteCommand({
    TransactItems: records.map(item => ({
      Delete: {
        TableName: db.tableName,
        Key: {
          InboundConversationId: item.InboundConversationId,
          Layer: item.Layer
        }
      }
    }))
  });

  await db.client.send(deleteCommand);
};

export const cleanupRecordsForTestByNhsNumber = async nhsNumber => {
  // This method is only meant for testing purpose
  const db = EhrTransferTracker.getInstance();
  const allConversations = await db.queryTableByNhsNumber(nhsNumber);
  const removeAllRecords = allConversations.map(item =>
    cleanupRecordsForTest(item.InboundConversationId)
  );
  return Promise.all(removeAllRecords);
};
