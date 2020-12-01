import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/registration-request';
import { getRegistrationRequestStatusByConversationId } from '../../database/registration-request-repository';

describe('Registration request repository', () => {
  const RegistrationRequest = ModelFactory.getByName(modelName);

  afterAll(async () => {
    await RegistrationRequest.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should retrieve the registration request by conversation id', async () => {
    const conversationId = '22a748b2-fef6-412d-b93a-4f6c68f0f8dd';
    const odsCode = 'B12345';
    const nhsNumber = '1234567891';
    const status = Status.REGISTRATION_REQUEST_RECEIVED;

    await RegistrationRequest.create({
      conversationId,
      nhsNumber,
      status,
      odsCode
    });

    const registrationRequest = await getRegistrationRequestStatusByConversationId(conversationId);
    expect(registrationRequest.nhsNumber).toBe(nhsNumber);
    expect(registrationRequest.status).toBe(status);
    expect(registrationRequest.odsCode).toBe(odsCode);
    expect(registrationRequest.conversationId).toBe(conversationId);
  });

  it('should return null when it cannot find the registration request', async () => {
    const nonExistentConversationId = '4be94216-b00d-4355-8929-b22c8512b074';
    const registrationRequest = await getRegistrationRequestStatusByConversationId(
      nonExistentConversationId
    );
    expect(registrationRequest).toBe(null);
  });
});
