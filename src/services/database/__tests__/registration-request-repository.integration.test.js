import { v4 as uuid } from 'uuid';
import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/registration-request';
import {
  getNhsNumberByConversationId,
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../registration-request-repository';
import {NhsNumberNotFoundError} from "../../../errors/errors";

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

  it('should change registration request status to invalid_ods_code', async () => {
    const conversationId = 'e30d008e-0134-479c-bf59-6d4978227617';
    const nhsNumber = '1234567890';
    const status = Status.INCORRECT_ODS_CODE;
    const odsCode = 'B1234';

    await RegistrationRequest.create({
      conversationId,
      nhsNumber,
      status,
      odsCode
    });

    await updateRegistrationRequestStatus(conversationId, status);

    const registrationRequest = await RegistrationRequest.findByPk(conversationId);

    expect(registrationRequest.status).toBe(status);
  });

  describe('getNhsNumberByConversationId', () => {
    it('should return the nhs number of a registration-request', async () => {
      // given
      const conversationId = uuid();
      const odsCode = 'B12345';
      const nhsNumber = '1234567890'
      const status = Status.REGISTRATION_REQUEST_RECEIVED

      await RegistrationRequest.create({
        conversationId,
        nhsNumber,
        status,
        odsCode
      });

      // when
      const returnedNhsNumber = await getNhsNumberByConversationId(conversationId)

      // then
      expect(returnedNhsNumber).toEqual(nhsNumber);
    });

    it('should throw NHS_NUMBER_NOT_FOUND_ERROR if cannot find the nhs number related to given conversation id', async () => {
      // given
      const conversationId = uuid();

      // when
      await expect(getNhsNumberByConversationId(conversationId))
          // then
          .rejects.toThrow(NhsNumberNotFoundError);
    });
  });
});
