import ModelFactory from '../../../models';
import {
  modelName as messageFragmentModel,
  Status as MessageFragmentStatus
} from '../../../models/message-fragment';
import {
  modelName as registrationRequestModel,
  Status as registrationRequestStatus
} from '../../../models/registration-request';
import {
  getAllMessageFragmentRecordsByMessageIds,
  getMessageFragmentRecordByMessageId,
  updateMessageFragmentRecordStatus
} from '../message-fragment-repository';
import { v4 as uuidv4 } from 'uuid';
import { logInfo } from '../../../middleware/logging';
import { createRandomUUID } from "../../gp2gp/__tests__/test-utils";

jest.mock('../../../middleware/logging');

describe('message-fragment-repository.js', () => {
  // ============ COMMON PROPERTIES ============
  const MessageFragment = ModelFactory.getByName(messageFragmentModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);
  // =================== END ===================

  // Set Up
  beforeAll(async () => {
    await RegistrationRequest.truncate();
    await MessageFragment.truncate();
    await RegistrationRequest.sync({ force: true });
    await MessageFragment.sync({ force: true });
  });

  // Tear Down
  afterAll(async () => {
    await RegistrationRequest.sequelize.sync({ force: true });
    await MessageFragment.sequelize.sync({ force: true });
    await RegistrationRequest.sequelize.close();
    await ModelFactory.sequelize.close();
  });

  describe('getMessageFragmentStatusByMessageId', () => {
    it('should retrieve ehr fragment by message id', async () => {
      // given
      const messageId = 'd3809b41-1996-46ff-a103-47aace310ecb';
      const conversationId = '22a748b2-fef6-412d-b93a-4f6c68f0f8dd';
      const status = MessageFragmentStatus.FRAGMENT_REQUEST_RECEIVED;
      const registrationStatus = registrationRequestStatus.REGISTRATION_REQUEST_RECEIVED;
      const nhsNumber = '1234567891';
      const odsCode = 'B0145B';

      await RegistrationRequest.create({
        conversationId,
        nhsNumber,
        odsCode,
        status: registrationStatus
      });

      // when
      await MessageFragment.create({
        messageId,
        conversationId,
        status
      });

      const record = await getMessageFragmentRecordByMessageId(messageId);

      // then
      expect(record.messageId).toBe(messageId);
      expect(record.conversationId).toBe(conversationId);
      expect(record.status).toBe(status);
    });
    it('should return null when it cannot find the message id in record', async () => {
      // when
      const nonExistentMessageId = '9dd61fbe-1958-4479-a6aa-14cb4aa9651a';
      const record = await getMessageFragmentRecordByMessageId(nonExistentMessageId);

      // then
      expect(record).toBe(null);
    });
  });

  describe('updateMessageFragmentStatus', () => {
    // ============ COMMON PROPERTIES ============
    const registrationStatus = registrationRequestStatus.REGISTRATION_REQUEST_RECEIVED;
    const initialStatus = MessageFragmentStatus.FRAGMENT_REQUEST_RECEIVED;
    const updatedStatus = MessageFragmentStatus.SENDING_FAILED;
    const messageId = '9dd61fbe-1958-4479-a6aa-14cb4aa9651a';
    const conversationId = 'efec71f4-bc54-4a31-9453-f1300bf28cef';
    const nhsNumber = '1234567890';
    const odsCode = 'B0145A';
    // =================== END ===================

    it('should update message fragment status successfully', async () => {
      // when ...
      await RegistrationRequest.create({
        conversationId,
        nhsNumber,
        odsCode,
        status: registrationStatus
      });
      await MessageFragment.create({
        messageId,
        conversationId,
        status: initialStatus
      });

      await updateMessageFragmentRecordStatus(messageId, updatedStatus);

      const record = await MessageFragment.findByPk(messageId);

      // then
      expect(record.conversationId).toBe(conversationId);
      expect(record.messageId).toBe(messageId);
      expect(record.status).toBe(updatedStatus);
      expect(logInfo).toHaveBeenCalledWith('Updated message fragment status has been stored');
    });
  });

  describe('getAllMessageFragmentRecordsByMessageIds', () => {
    it('should get all the fragment records successfully', async () => {
      // given
      const numberOfFragments = 10;
      const conversationId = uuidv4();
      const messageIds = createRandomUUID(numberOfFragments);
      const nhsNumber = 1234567890;
      const odsCode = "B14758";
      const registrationStatus = registrationRequestStatus.REGISTRATION_REQUEST_RECEIVED;
      const initialStatus = MessageFragmentStatus.FRAGMENT_REQUEST_RECEIVED;

      // when
      await RegistrationRequest.create({ conversationId, nhsNumber, odsCode, status: registrationStatus });

      for (let i = 0; i < numberOfFragments; i++) {
        const messageId = messageIds[i];
        await MessageFragment.create({ messageId, conversationId, status: initialStatus });
      }

      const result = await getAllMessageFragmentRecordsByMessageIds(messageIds);
      const messageIdsFromResult = result.map(record => record.messageId);

      // then
      expect(result.length).toEqual(messageIds.length);
      expect(messageIdsFromResult).toEqual(messageIds);
    });
  });
});
