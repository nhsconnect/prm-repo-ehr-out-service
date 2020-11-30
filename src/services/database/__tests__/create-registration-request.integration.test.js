import { createRegistrationRequest } from '../create-registration-request';
import { runWithinTransaction } from '../helper';
import { logEvent, logError } from '../../../middleware/logging';
import ModelFactory from '../../../models';
import { modelName } from '../../../models/registration-request';

jest.mock('../../../middleware/logging');

describe('createRegistrationRequest', () => {
  const nhsNumber = '1234567890';
  const odsCode = 'B1234';
  const RegistrationRequest = ModelFactory.getByName(modelName);

  afterAll(async () => {
    await RegistrationRequest.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should create registration request with correct values', async () => {
    const conversationId = '9ca400c5-4ba3-4cfa-9ae5-96887e4d81d2';
    await createRegistrationRequest(conversationId, nhsNumber, odsCode);
    const registrationRequest = await runWithinTransaction(transaction =>
      RegistrationRequest.findOne({
        where: {
          conversation_id: conversationId
        },
        transaction: transaction
      })
    );
    expect(registrationRequest).not.toBeNull();
    expect(registrationRequest.get().conversationId).toBe(conversationId);
    expect(registrationRequest.get().nhsNumber).toBe(nhsNumber);
  });

  it('should log event if data persisted correctly', () => {
    const conversationId = '36e9c17f-943c-4efc-9afd-a6f8d58bc884';
    return createRegistrationRequest(conversationId, nhsNumber, odsCode).then(() => {
      expect(logEvent).toHaveBeenCalled();
      return expect(logEvent).toHaveBeenCalledWith({
        status: 'Registration request has been stored'
      });
    });
  });

  it('should log errors when nhs number is invalid', () => {
    const conversationId = '8fa34b56-7c52-461b-9d52-682bd2eb9c9a';
    return createRegistrationRequest(conversationId, '123', odsCode).catch(error => {
      expect(logError).toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(error);
      return expect(error.message).toContain('Validation len on nhsNumber failed');
    });
  });

  it('should log errors when conversationId is invalid', () => {
    return createRegistrationRequest('invalid-conversation-id', nhsNumber, odsCode).catch(error => {
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(error);
      return expect(error.message).toContain(
        'invalid input syntax for type uuid: "invalid-conversation-id"'
      );
    });
  });
});
