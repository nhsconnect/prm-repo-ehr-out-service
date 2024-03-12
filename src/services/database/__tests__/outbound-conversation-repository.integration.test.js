import { v4 as uuid } from 'uuid';

import { NhsNumberNotFoundError, OutboundConversationNotFoundError } from '../../../errors/errors';
import {
  cleanupRecordsForTest,
  createCompleteRecordForTest
} from '../../../utilities/integration-test-utilities';
import {
  createOutboundConversation,
  getNhsNumberByOutboundConversationId,
  getOutboundConversationById,
  updateOutboundConversationStatus
} from '../outbound-conversation-repository';
import { ConversationStatus } from '../../../constants/enums';

describe('outbound-conversation-repository', () => {
  // CONSTANTS AND SETUPS
  const INBOUND_CONVERSATION_ID = uuid();
  const NHS_NUMBER = '9000000001';
  const INBOUND_CORE_MESSAGE_ID = uuid();
  const INBOUND_FRAGMENT_IDS = [uuid(), uuid(), uuid()];
  const ODS_CODE = 'B12345';

  beforeEach(async () => {
    await createCompleteRecordForTest(
      INBOUND_CONVERSATION_ID,
      NHS_NUMBER,
      INBOUND_CORE_MESSAGE_ID,
      INBOUND_FRAGMENT_IDS
    );
  });

  afterAll(async () => {
    await cleanupRecordsForTest(INBOUND_CONVERSATION_ID);
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
