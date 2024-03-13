import { v4 as uuid } from 'uuid';

import { OutboundConversationNotFoundError } from '../../../errors/errors';
import {
  cleanupRecordsForTest,
  createInboundRecordForTest
} from '../../../utilities/integration-test-utilities';
import {
  createOutboundConversation,
  getNhsNumberByOutboundConversationId,
  getOutboundConversationById,
  updateOutboundConversationStatus
} from '../outbound-conversation-repository';
import {
  ConversationStatus,
  CoreStatus,
  FragmentStatus,
  RecordType
} from '../../../constants/enums';
import { logError, logInfo } from '../../../middleware/logging';
import { EhrTransferTracker } from '../dynamo-ehr-transfer-tracker';
import { buildUpdateParamFromItem } from '../../../utilities/dynamodb-helper';
import { isConversation } from '../../../models/conversation';
import { isCore } from '../../../models/core';
import { isFragment } from '../../../models/fragment';

// Mocking
jest.mock('../../../middleware/logging');

describe('outbound-conversation-repository', () => {
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
  describe('createOutboundConversation', () => {
    it('should create outboundConversation with correct values', async () => {
      // given
      const conversationId = uuid();

      // when
      await createOutboundConversation(conversationId, NHS_NUMBER, ODS_CODE);

      // then
      const conversation = await getOutboundConversationById(conversationId);

      expect(conversation).not.toBeNull();
      expect(conversation.OutboundConversationId).toBe(conversationId);
      expect(conversation.NhsNumber).toBe(NHS_NUMBER);
      expect(conversation.DestinationGp).toBe(ODS_CODE);
      expect(conversation.InboundConversationId).toBe(INBOUND_CONVERSATION_ID);
      expect(conversation.TransferStatus).toBe(ConversationStatus.OUTBOUND_STARTED);
    });

    it('should log event if data persisted correctly', async () => {
      // given
      const conversationId = uuid();

      // when
      await createOutboundConversation(conversationId, NHS_NUMBER, ODS_CODE);

      // then
      expect(logInfo).toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith('Outbound conversation has been stored');
    });

    it('should log errors when nhs number is invalid', async () => {
      // given
      const conversationId = uuid();

      try {
        // when
        await createOutboundConversation(conversationId, '123', ODS_CODE);
      } catch (err) {
        // then
        expect(logError).toHaveBeenCalled();
        expect(err.message).toContain('NhsNumber must be a 10 digits number');
      }
    });

    it('should log errors when conversationId is invalid', async () => {
      try {
        // when
        await createOutboundConversation('invalid-conversation-id', NHS_NUMBER, ODS_CODE);
      } catch (err) {
        // then
        expect(logError).toHaveBeenCalled();
        expect(err.message).toContain('OutboundConversationId is not a valid UUID');
      }
    });

    it('should clear any previous outbound record before starting new outbound transfer', async () => {
      // ========================= GIVEN =============================
      const previousOutboundConversationId = uuid();
      const previousDestinationGp = 'A12345';
      const newOutboundConversationId = uuid();
      const items = await db.queryTableByInboundConversationId(
        INBOUND_CONVERSATION_ID,
        RecordType.ALL
      );
      const mockPreviousOutboundTransfer = items.map(item => {
        let changes = { OutboundConversationId: previousOutboundConversationId };
        if (isConversation(item)) {
          changes.TransferStatus = ConversationStatus.OUTBOUND_COMPLETE;
          changes.DestinationGp = previousDestinationGp;
        } else {
          changes.TransferStatus = FragmentStatus.OUTBOUND_COMPLETE;
          changes.OutboundMessageId = uuid();
        }
        return buildUpdateParamFromItem(item, changes);
      });
      await db.updateItemsInTransaction(mockPreviousOutboundTransfer);

      // to verify the mock previous outbound record was created correctly
      const previousRecord = await db.queryTableByOutboundConversationId(
        previousOutboundConversationId
      );
      expect(previousRecord).toHaveLength(5);

      // ========================= WHEN =============================
      await createOutboundConversation(newOutboundConversationId, NHS_NUMBER, ODS_CODE);

      // ========================= THEN =============================
      const conversation = await getOutboundConversationById(newOutboundConversationId);

      expect(conversation.OutboundConversationId).toBe(newOutboundConversationId);
      expect(conversation.InboundConversationId).toBe(INBOUND_CONVERSATION_ID);
      expect(conversation.NhsNumber).toBe(NHS_NUMBER);
      expect(conversation.DestinationGp).toBe(ODS_CODE);
      expect(conversation.TransferStatus).toBe(ConversationStatus.OUTBOUND_STARTED);

      const updatedRecords = await db.queryTableByOutboundConversationId(newOutboundConversationId);
      expect(updatedRecords).toHaveLength(5); // conversation + core + 3 fragments
      const coreAndFragments = [
        ...updatedRecords.filter(isCore),
        ...updatedRecords.filter(isFragment)
      ];

      for (const item of coreAndFragments) {
        expect(item.OutboundConversationId).toBe(newOutboundConversationId);
        expect(item.InboundConversationId).toBe(INBOUND_CONVERSATION_ID);
        expect(item.TransferStatus).toBe(CoreStatus.INBOUND_COMPLETE);
        expect(item.OutboundMessageId).toBeUndefined();
      }

      await expect(getOutboundConversationById(previousOutboundConversationId)).rejects.toThrow(
        OutboundConversationNotFoundError
      );
    });
  });

  describe('getOutboundConversationById', () => {
    it('should retrieve the outbound conversation by conversation id', async () => {
      // given
      const conversationId = uuid();
      await createOutboundConversation(conversationId, NHS_NUMBER, ODS_CODE);

      // when
      const outboundConversation = await getOutboundConversationById(conversationId);

      // then
      const expectedStatus = ConversationStatus.OUTBOUND_STARTED;
      expect(outboundConversation.NhsNumber).toBe(NHS_NUMBER);
      expect(outboundConversation.TransferStatus).toBe(expectedStatus);
      expect(outboundConversation.DestinationGp).toBe(ODS_CODE);
      expect(outboundConversation.OutboundConversationId).toBe(conversationId);
    });

    it('should throw an error when it cannot find the outbound conversation', async () => {
      // given
      const nonExistentConversationId = uuid();

      // when
      await expect(getOutboundConversationById(nonExistentConversationId))
        // then
        .rejects.toThrow(OutboundConversationNotFoundError);
    });
  });

  describe('updateOutboundConversationStatus', () => {
    it('should change the TransferStatus of conversation', async () => {
      // given
      const conversationId = uuid();
      const status = ConversationStatus.OUTBOUND_FAILED;
      await createOutboundConversation(conversationId, NHS_NUMBER, ODS_CODE);

      // when
      await updateOutboundConversationStatus(conversationId, status);

      const outboundConversation = await getOutboundConversationById(conversationId);

      // then
      expect(outboundConversation.TransferStatus).toBe(status);
    });
  });

  describe.skip('updateRegistrationRequestMessageId', () => {
    // TODO: replacement method not implemented yet
    it('should update the message id successfully', async () => {
      // given
      const conversationId = 'e7a1b0ea-c51d-499e-a25a-d155b6df9904';
      const inboundMessageId = '0d3ff0e6-27a1-4e98-a3e8-ac67c930df5e';
      const outboundMessageId = '37bfaf7e-cfe2-4300-8804-a6629f8db1fc';
      const odsCode = 'B23456';
      const nhsNumber = '1478541274';
      const status = Status.REGISTRATION_REQUEST_RECEIVED;

      // when
      await createRegistrationRequest(conversationId, inboundMessageId, nhsNumber, odsCode);
      await updateRegistrationRequestMessageId(inboundMessageId, outboundMessageId);
      const registrationRequest = await getRegistrationRequestByConversationId(conversationId);

      // then
      expect(registrationRequest.nhsNumber).toBe(nhsNumber);
      expect(registrationRequest.status).toBe(status);
      expect(registrationRequest.odsCode).toBe(odsCode);
      expect(registrationRequest.conversationId).toBe(conversationId);
      expect(registrationRequest.messageId).toBe(outboundMessageId);
    });
  });

  describe('getNhsNumberByOutboundConversationId', () => {
    it('should return the nhs number of a registration-request', async () => {
      // given
      const conversationId = uuid();
      await createOutboundConversation(conversationId, NHS_NUMBER, ODS_CODE);

      // when
      const returnedNhsNumber = await getNhsNumberByOutboundConversationId(conversationId);

      // then
      expect(returnedNhsNumber).toEqual(NHS_NUMBER);
    });

    it('should throw an error if cannot find the nhs number related to given conversation id', async () => {
      // given
      const conversationId = uuid();

      // when
      await expect(getNhsNumberByOutboundConversationId(conversationId))
        // then
        .rejects.toThrow(OutboundConversationNotFoundError);
    });
  });

  describe.skip('registrationRequestExistsWithMessageId', () => {
    // TODO: replacement method not implemented yet
    it('should return true if a registration request is found, given a valid messageId', async () => {
      // given
      const conversationId = 'c511e4dd-f278-4a9d-ad2d-1ac547e9f990';
      const messageId = 'cb702eef-62e9-4636-a172-2535a0a02508';
      const odsCode = 'B23456';
      const nhsNumber = '1247415214';

      // when
      await createRegistrationRequest(conversationId, messageId, nhsNumber, odsCode);

      const foundRecord = await registrationRequestExistsWithMessageId(messageId);

      // then
      expect(foundRecord).toEqual(true);
    });

    it('should return false if a registration request is not found, given an non-existent messageId', async () => {
      // given
      const nonExistentMessageId = 'bcd566db-2044-4dfc-88e7-5487ccb80f7e';

      // when
      const foundRecord = await registrationRequestExistsWithMessageId(nonExistentMessageId);

      // then
      expect(foundRecord).toEqual(false);
    });
  });
});
