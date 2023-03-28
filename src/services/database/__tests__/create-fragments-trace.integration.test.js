import { logInfo, logError } from '../../../middleware/logging';
import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/fragments-trace';
import { createFragmentsTrace } from '../create-fragments-trace';
import { createRegistrationRequest } from '../create-registration-request';
import { runWithinTransaction } from '../helper';

jest.mock('../../../middleware/logging');

describe('createFragmentsRequest', () => {
  const FragmentsTrace = ModelFactory.getByName(modelName);
  const conversationId = '40abdd36-6f86-455a-8135-4ab4c764cdd1';

  // clean the table before and after test to avoid affecting other test
  beforeAll(async () => {
    await FragmentsTrace.truncate();
    await FragmentsTrace.sync({ force: true });

    // create a parent record of RegistrationRequest
    await createRegistrationRequest(conversationId, "1234567890", "fake-ods-code");
  })
  
  afterAll(async () => {
    await FragmentsTrace.truncate();
    await FragmentsTrace.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should create fragments request with correct values', async () => {
    
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da41';

    try {
      await createFragmentsTrace(messageId, conversationId);
    } catch (err){
      console.log(err);
      throw err;
    }

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
    const messageId = '22e30a14-213a-42f3-8cc0-64c62175da42';
    await createFragmentsTrace(messageId, conversationId);

    expect(logInfo).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith('Fragments trace has been stored');
  });

  it('should log errors when messageId is invalid', async () => {
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
