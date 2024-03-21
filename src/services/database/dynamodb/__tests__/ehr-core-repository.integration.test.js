import { v4 as uuid } from 'uuid';
import { EhrTransferTracker } from '../dynamo-ehr-transfer-tracker';
import {
  buildMessageIdReplacement,
  cleanupRecordsForTest,
  createInboundRecordForTest
} from '../../../../utilities/integration-test-utilities';
import { createOutboundConversation } from '../outbound-conversation-repository';
import { storeOutboundMessageIds } from '../store-outbound-message-ids';
import { messageIdMatchOutboundCore } from '../ehr-core-repository';

describe('ehr-core-repository', () => {
  // ================ CONSTANTS AND SETUPS =====================
  const INBOUND_CONVERSATION_ID = uuid();
  const NHS_NUMBER = '9000000001';
  const INBOUND_CORE_MESSAGE_ID = uuid();
  const INBOUND_FRAGMENT_IDS = [uuid(), uuid(), uuid()];
  const ODS_CODE = 'B12345';
  const db = EhrTransferTracker.getInstance();

  beforeEach(async () => {
    await createInboundRecordForTest(
      INBOUND_CONVERSATION_ID,
      NHS_NUMBER,
      INBOUND_CORE_MESSAGE_ID,
      INBOUND_FRAGMENT_IDS
    );
  });

  afterAll(async () => {
    await cleanupRecordsForTest(INBOUND_CONVERSATION_ID);
  });

  // ================ TEST STARTS HERE =====================
  describe('messageIdMatchOutboundCore', () => {
    it('should return true when the given messageId match the OutboundMessageId of core', async () => {
      // given
      const outboundConversationId = uuid();
      const outboundCoreMessageId = uuid();
      const outboundFragmentIds = INBOUND_FRAGMENT_IDS.map(() => uuid());
      const messageIdReplacement = buildMessageIdReplacement(
        [INBOUND_CORE_MESSAGE_ID, ...INBOUND_FRAGMENT_IDS],
        [outboundCoreMessageId, ...outboundFragmentIds]
      );

      // when
      await createOutboundConversation(outboundConversationId, NHS_NUMBER, ODS_CODE);
      await storeOutboundMessageIds(messageIdReplacement, INBOUND_CONVERSATION_ID);

      const result = await messageIdMatchOutboundCore(
        outboundConversationId,
        outboundCoreMessageId
      );

      // then
      expect(result).toEqual(true);
    });

    it('should return false if the given messageId does not match OutboundMessageId of core', async () => {
      // given
      const outboundConversationId = uuid();
      const outboundCoreMessageId = uuid();
      const outboundFragmentIds = INBOUND_FRAGMENT_IDS.map(() => uuid());
      const messageIdReplacement = buildMessageIdReplacement(
        [INBOUND_CORE_MESSAGE_ID, ...INBOUND_FRAGMENT_IDS],
        [outboundCoreMessageId, ...outboundFragmentIds]
      );

      const nonExistMessageId = uuid();

      // when
      await createOutboundConversation(outboundConversationId, NHS_NUMBER, ODS_CODE);
      await storeOutboundMessageIds(messageIdReplacement, INBOUND_CONVERSATION_ID);

      const result = await messageIdMatchOutboundCore(outboundConversationId, nonExistMessageId);

      // then
      expect(result).toEqual(false);
    });
  });
});
