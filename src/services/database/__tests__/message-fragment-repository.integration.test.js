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
  getMessageFragmentStatusByMessageId,
  updateMessageFragmentStatus
} from '../message-fragment-repository';
import { v4 as uuidv4 } from 'uuid';
import { logError, logInfo } from '../../../middleware/logging';
import { errorMessages, FragmentMessageRecordNotFoundError } from '../../../errors/errors';

jest.mock('../../../middleware/logging');

describe('message-fragment-repository.js', () => {
  // ============ COMMON PROPERTIES ============
  const MessageFragment = ModelFactory.getByName(messageFragmentModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);
  // =================== END ===================

  // Set Up
  beforeAll(async () => {
    // clean and sync the table before test
    await MessageFragment.truncate();
    await MessageFragment.sync({ force: true });
  });

  // Tear Down
  afterAll(async () => {
    await MessageFragment.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  describe('getMessageFragmentStatusByMessageId', () => {
    it('should retrieve the status of ehr fragment by message id', async () => {
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

      const record = await getMessageFragmentStatusByMessageId(messageId);

      // then
      expect(record.messageId).toBe(messageId);
      expect(record.conversationId).toBe(conversationId);
      expect(record.status).toBe(status);
    });

    it('should return null when it cannot find the message id in record', async () => {
      // when
      const nonExistentMessageId = '9dd61fbe-1958-4479-a6aa-14cb4aa9651a';
      const record = await getMessageFragmentStatusByMessageId(nonExistentMessageId);

      // then
      expect(record).toBe(null);
    });
  });

  describe('updateMessageFragmentStatus', () => {
    // ============ COMMON PROPERTIES ============
    const registrationStatus = registrationRequestStatus.REGISTRATION_REQUEST_RECEIVED;
    const initialStatus = MessageFragmentStatus.FRAGMENT_REQUEST_RECEIVED;
    const updatedStatus = MessageFragmentStatus.FRAGMENT_SENDING_FAILED;
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

      await updateMessageFragmentStatus(messageId, updatedStatus);

      const record = await MessageFragment.findByPk(messageId);

      // then
      expect(record.conversationId).toBe(conversationId);
      expect(record.messageId).toBe(messageId);
      expect(record.status).toBe(updatedStatus);
      expect(logInfo).toHaveBeenCalledWith('Updated message fragment status has been stored');
    });

    it('should throw an error when trying to update a non-existing message fragment', async () => {
      // given
      const nonExistMessageId = uuidv4().toUpperCase();

      // when
      await expect(updateMessageFragmentStatus(nonExistMessageId, updatedStatus))
        // then
        .rejects.toThrow(FragmentMessageRecordNotFoundError);

      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining(errorMessages.FRAGMENT_MESSAGE_RECORD_NOT_FOUND_ERROR)
      );
    });
  });
});
