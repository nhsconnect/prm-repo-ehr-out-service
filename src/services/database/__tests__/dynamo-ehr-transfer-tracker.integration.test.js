import { EhrTransferTracker } from '../dynamo-ehr-transfer-tracker';
import { v4 as uuid } from 'uuid';
import { RecordType } from '../../../constants/enums';
import { cleanupRecordsForTest } from '../../../utilities/integration-test-utilities';
// import { buildCore } from '../../../models/core';

describe('EhrTransferTracker', () => {
  const testConversationId = uuid();

  afterEach(async () => {
    await cleanupRecordsForTest(testConversationId);
  });

  it('can create and read a record in dynamodb', async () => {
    // given
    const db = EhrTransferTracker.getInstance();
    const testMessageId = uuid();

    const ehrCore = {
      InboundConversationId: testConversationId,
      InboundMessageId: testMessageId,
      Layer: `CORE#${testMessageId}`
    };

    await db.writeItemsInTransaction([ehrCore]);

    // then
    const actual = await db.queryTableByConversationId(testConversationId, RecordType.CORE);

    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      InboundConversationId: testConversationId,
      InboundMessageId: testMessageId,
      Layer: `CORE#${testMessageId}`
    });
  });
});
