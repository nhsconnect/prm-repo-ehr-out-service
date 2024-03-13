import { FragmentMessageIdReplacementRecordNotFoundError } from '../../../errors/errors';
import { v4 } from 'uuid';
import { EhrTransferTracker } from '../dynamo-ehr-transfer-tracker';
import {
  cleanupRecordsForTest,
  createInboundRecordForTest
} from '../../../utilities/integration-test-utilities';
import {
  getAllMessageIdPairs,
  getAllFragmentIdsToBeSent,
  updateFragmentStatusInDb
} from '../dynamodb-fragment-repository';
import { createOutboundConversation } from '../outbound-conversation-repository';
import { storeOutboundMessageIds } from '../store-outbound-message-ids';
import { FragmentStatus, RecordType } from '../../../constants/enums';
import { logInfo } from '../../../middleware/logging';
import { getAllFragmentOutboundMessageIdsEligibleToBeSent } from '../message-fragment-repository';
import { Status as messageFragmentStatus } from '../../../models/message-fragment';
import { buildUpdateParamFromItem } from '../../../utilities/dynamodb-helper';

jest.mock('../../../middleware/logging');

const uuid = () => v4().toUpperCase();
describe('dynamodb-fragment-repository', () => {
  // ================ CONSTANTS AND SETUPS =====================
  const db = EhrTransferTracker.getInstance();

  const ODS_CODE = 'B12345';
  const INBOUND_CONVERSATION_ID = uuid();
  const OUTBOUND_CONVERSATION_ID = uuid();
  const NHS_NUMBER = '9000000005';

  let messageIdReplacementRecords = [];
  const numberOfRecordsToSeed = 10;

  let inboundCoreMessageId;
  let inboundFragmentMessageIds;

  // Seed the database with test values.
  beforeEach(async () => {
    messageIdReplacementRecords = seedTestData(numberOfRecordsToSeed);
    const oldMessageIds = getAllOldMessageIds(messageIdReplacementRecords);
    inboundCoreMessageId = oldMessageIds[0];
    inboundFragmentMessageIds = oldMessageIds.slice(1);

    // mimic the flow of ehr-in and then ehr-out
    await createInboundRecordForTest(
      INBOUND_CONVERSATION_ID,
      NHS_NUMBER,
      inboundCoreMessageId,
      inboundFragmentMessageIds
    );
    await createOutboundConversation(OUTBOUND_CONVERSATION_ID, NHS_NUMBER, ODS_CODE);
    await storeOutboundMessageIds(messageIdReplacementRecords, INBOUND_CONVERSATION_ID);
  });

  afterEach(async () => {
    await cleanupRecordsForTest(INBOUND_CONVERSATION_ID);
    messageIdReplacementRecords = {};
  });

  describe('getAllMessageIdPairs', () => {
    it('should retrieve all of the message ids with replacements successfully', async () => {
      // given
      const oldMessageIds = getAllOldMessageIds(messageIdReplacementRecords);

      // when
      const result = await getAllMessageIdPairs(oldMessageIds, INBOUND_CONVERSATION_ID);

      // then
      expect(result.length).toEqual(messageIdReplacementRecords.length);
      expect(result).toEqual(expect.arrayContaining(messageIdReplacementRecords));
    });

    it('should throw FragmentMessageIdReplacementRecordNotFoundError if provided a non-existent message id', async () => {
      // given
      const nonExistentMessageId = 'faed05ff-7f8f-41f9-b44f-5e98289c98f2';
      const oldMessageIdsWithOneInvalid = [
        ...getAllOldMessageIds(messageIdReplacementRecords).slice(0, numberOfRecordsToSeed - 1),
        nonExistentMessageId
      ];

      // when
      await expect(
        getAllMessageIdPairs(oldMessageIdsWithOneInvalid, INBOUND_CONVERSATION_ID)
        // then
      ).rejects.toThrow(FragmentMessageIdReplacementRecordNotFoundError);
    });
  });

  describe('updateFragmentStatusInDb', () => {
    it('should update message fragment status successfully', async () => {
      // given
      const updatedStatus = FragmentStatus.OUTBOUND_FAILED;
      const inboundMessageId = getAllOldMessageIds(messageIdReplacementRecords)[1];
      const outboundMessageId = getAllNewMessageIds(messageIdReplacementRecords)[1];

      // when
      await updateFragmentStatusInDb(INBOUND_CONVERSATION_ID, inboundMessageId, updatedStatus);

      // then
      const updatedFragment = await db.getItemByKey(
        INBOUND_CONVERSATION_ID,
        inboundMessageId,
        RecordType.FRAGMENT
      );

      expect(updatedFragment).toMatchObject({
        InboundConversationId: INBOUND_CONVERSATION_ID,
        OutboundConversationId: OUTBOUND_CONVERSATION_ID,
        InboundMessageId: inboundMessageId,
        OutboundMessageId: outboundMessageId,
        TransferStatus: updatedStatus
      });

      expect(logInfo).toHaveBeenCalledWith('Updated message fragment status has been stored');
    });
  });

  describe('getAllFragmentIdsToBeSent', () => {
    it('should get all eligible fragment Message IDs successfully', async () => {
      // given
      // calling .slice(1) here as the 0th message id in seed array is used for the core
      const allFragmentMessageIds = messageIdReplacementRecords.slice(1);

      // when
      const response = await getAllFragmentIdsToBeSent(INBOUND_CONVERSATION_ID);

      // then
      expect(response.length).toEqual(allFragmentMessageIds.length);
      expect(response).toEqual(expect.arrayContaining(allFragmentMessageIds));
    });

    it('should only return the eligible fragments', async () => {
      // given
      const allFragmentMessageIds = messageIdReplacementRecords.slice(1);
      const eligibleMessageIds = allFragmentMessageIds.slice(5);
      const ineligibleMessageIds = allFragmentMessageIds.filter(
        item => !eligibleMessageIds.includes(item)
      );

      const mockSomeFragmentsAlreadySentOut = ineligibleMessageIds.map(({ oldMessageId }) =>
        buildUpdateParamFromItem(
          {
            InboundConversationId: INBOUND_CONVERSATION_ID,
            Layer: `FRAGMENT#${oldMessageId}`
          },
          { TransferStatus: FragmentStatus.OUTBOUND_SENT }
        )
      );
      await db.updateItemsInTransaction(mockSomeFragmentsAlreadySentOut);

      // when
      const response = await getAllFragmentIdsToBeSent(INBOUND_CONVERSATION_ID);

      // then
      expect(response.length).not.toEqual(allFragmentMessageIds.length);
      expect(response.length).toEqual(eligibleMessageIds.length);
      expect(response).toEqual(expect.arrayContaining(eligibleMessageIds));
    });
  });
});

const seedTestData = numberOfRecordsToSeed => {
  return Array(numberOfRecordsToSeed)
    .fill(undefined)
    .map(() => {
      return {
        oldMessageId: uuid(),
        newMessageId: uuid()
      };
    });
};

const getAllOldMessageIds = records => records.map(record => record.oldMessageId);
const getAllNewMessageIds = records => records.map(record => record.newMessageId);
