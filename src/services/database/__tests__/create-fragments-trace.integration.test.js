import { logInfo, logError } from '../../../middleware/logging';
import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/fragments-trace';
import { createFragmentsTrace } from '../create-fragments-trace';
import { runWithinTransaction } from '../helper';

jest.mock('../../../middleware/logging');

describe('createFragmentsRequest', () => {
  const FragmentsTrace = ModelFactory.getByName(modelName);

  afterAll(async () => {
    await FragmentsTrace.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should create fragments request with correct values', async () => {
    const conversationId = '9ca400c5-4ba3-4cfa-9ae5-96887e4d81d2';
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da41';
    await createFragmentsTrace(messageId, conversationId);
    const fragmentsTrace = await runWithinTransaction(transaction =>
      FragmentsTrace.findOne({
        where: {
          message_id: messageId
        },
        transaction: transaction
      })
    );
    expect(fragmentsTrace).not.toBeNull();
    expect(fragmentsTrace.get().conversationId).toBe(conversationId);
    expect(fragmentsTrace.get().messageId).toBe(messageId);
    expect(fragmentsTrace.get().status).toBe(Status.FRAGMENT_REQUEST_RECEIVED);
  });

  it('should log event if data persisted correctly', async () => {
    const conversationId = '36e9c17f-943c-4efc-9afd-a6f8d58bc884';
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da42';
    await createFragmentsTrace(messageId, conversationId);

    expect(logInfo).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith('Fragments trace has been stored');
  });

  it('should log errors when messageId is invalid', async () => {
    const conversationId = '9ca400c5-4ba3-4cfa-9ae5-96887e4d81d2';
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da43';
    try {
      await createFragmentsTrace('invalid-message-id', conversationId);
    } catch (err) {
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(err);
      expect(err.message).toContain('invalid input syntax for type uuid: "invalid-message-id"');
    }
  });

  it('should log errors when conversationId is invalid', async () => {
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da44';
    try {
      await createFragmentsTrace(messageId, 'invalid-conversation-id');
    } catch (err) {
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(err);
      expect(err.message).toContain(
        'invalid input syntax for type uuid: "invalid-conversation-id"'
      );
    }
  });
});
