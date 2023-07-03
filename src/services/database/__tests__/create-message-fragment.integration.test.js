import { logInfo, logError } from '../../../middleware/logging';
import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/message-fragment';
import { createMessageFragment } from '../create-message-fragment';
import { createRegistrationRequest } from '../create-registration-request';
import { runWithinTransaction } from '../helper';

jest.mock('../../../middleware/logging');

describe('createFragmentsRequest', () => {
  const MessageFragment = ModelFactory.getByName(modelName);
  const conversationId = '40abdd36-6f86-455a-8135-4ab4c764cdd1';
  const messageId = '9b9ca459-1f52-4e77-862c-52fb897b6070';

  beforeAll(async () => {
    // clean and sync the table before test
    await MessageFragment.truncate();
    await MessageFragment.sync({ force: true });

    // create a parent record of RegistrationRequest
    await createRegistrationRequest(conversationId, "1234567890", messageId, "fake-ods-code");
  })
  
  afterAll(async () => {
    await MessageFragment.truncate();
    await MessageFragment.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should create fragments request with correct values', async () => {
    // Given
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da41';

    // When
    await createMessageFragment(messageId, conversationId);

    // Then
    const messageFragment = await runWithinTransaction(transaction =>
      MessageFragment.findOne({
        where: {
          message_id: messageId
        },
        transaction: transaction
      })
    );
    expect(messageFragment).not.toBeNull();
    expect(messageFragment.get().conversationId).toBe(conversationId);
    expect(messageFragment.get().messageId).toBe(messageId);
    expect(messageFragment.get().status).toBe(Status.FRAGMENT_REQUEST_RECEIVED);
  });

  it('should log event if data persisted correctly', async () => {
    // Given
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da42';

    // When
    await createMessageFragment(messageId, conversationId);

    // Then
    expect(logInfo).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith('Message fragment status has been updated');
  });

  it('should log errors when messageId is invalid', async () => {
    try {
      // When
      await createMessageFragment('invalid-message-id', conversationId);
    } catch (err) {
      // Then
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(err);
      expect(err.message).toContain('invalid input syntax for type uuid: "invalid-message-id"');
    }
  });

  it('should log errors when conversationId is invalid', async () => {
    // Given
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da44';

    try {
      // When
      await createMessageFragment(messageId, 'invalid-conversatioan-id');
    } catch (err) {
      // Then
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(err);
      expect(err.message).toContain(
        'invalid input syntax for type uuid: "invalid-conversation-id"'
      );
    }
  });
});
