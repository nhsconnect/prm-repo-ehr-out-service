import { createRegistrationRequest } from "../create-registration-request";
import { modelName, Status } from '../../../models/registration-request';
import { NhsNumberNotFoundError } from "../../../errors/errors";
import {
  getNhsNumberByConversationId,
  getRegistrationRequestStatusByConversationId, registrationRequestExistsWithMessageId,
  updateRegistrationRequestStatus
} from '../registration-request-repository';
import ModelFactory from '../../../models';

describe('Registration request repository', () => {
  const RegistrationRequest = ModelFactory.getByName(modelName);

  beforeEach(async () => {
    await RegistrationRequest.truncate();
    await RegistrationRequest.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await ModelFactory.sequelize.close();
  });

  it('should retrieve the registration request by conversation id', async () => {
    // given
    const conversationId = '22a748b2-fef6-412d-b93a-4f6c68f0f8dd';
    const messageId = 'e4d0dde1-80bb-4c52-a299-90c92fdd5466';
    const odsCode = 'B12345';
    const nhsNumber = '1234567891';
    const status = Status.REGISTRATION_REQUEST_RECEIVED;

    // when
    await createRegistrationRequest(conversationId, nhsNumber, messageId, odsCode);
    const registrationRequest = await getRegistrationRequestStatusByConversationId(conversationId);

    // then
    expect(registrationRequest.nhsNumber).toBe(nhsNumber);
    expect(registrationRequest.status).toBe(status);
    expect(registrationRequest.odsCode).toBe(odsCode);
    expect(registrationRequest.conversationId).toBe(conversationId);
  });

  it('should return null when it cannot find the registration request', async () => {
    // given
    const nonExistentConversationId = '9c201efc-28b0-4ea0-ac5b-baf35bd575b8';

    // when
    const registrationRequest = await getRegistrationRequestStatusByConversationId(
      nonExistentConversationId
    );

    // then
    expect(registrationRequest).toBeNull();
  });

  it('should change registration request status to invalid_ods_code', async () => {
    // given
    const conversationId = 'e30d008e-0134-479c-bf59-6d4978227617';
    const messageId = '25bbc875-b5c8-4086-b420-ff759ab52426';
    const nhsNumber = '1234567890';
    const status = Status.INCORRECT_ODS_CODE;
    const odsCode = 'B1234';

    // when
    await createRegistrationRequest(conversationId, nhsNumber, messageId, odsCode);
    await updateRegistrationRequestStatus(conversationId, status);

    const registrationRequest = await RegistrationRequest.findByPk(conversationId);

    // then
    expect(registrationRequest.status).toBe(status);
  });

  describe('getNhsNumberByConversationId', () => {
    it('should return the nhs number of a registration-request', async () => {
      // given
      const conversationId = 'c8549520-b8ba-4ee5-b631-39c513082baa';
      const messageId = '008ebc80-61f6-485b-b0af-3665343e5d6c';
      const odsCode = 'B12345';
      const nhsNumber = '1234567890'
      const status = Status.REGISTRATION_REQUEST_RECEIVED

      // when
      await createRegistrationRequest(conversationId, nhsNumber, messageId, odsCode);
      const returnedNhsNumber = await getNhsNumberByConversationId(conversationId);

      // then
      expect(returnedNhsNumber).toEqual(nhsNumber);
    });

    it('should throw NHS_NUMBER_NOT_FOUND_ERROR if cannot find the nhs number related to given conversation id', async () => {
      // given
      const conversationId = 'a556f067-909a-48c7-8cce-16c5d9564db9';

      // when
      await expect(getNhsNumberByConversationId(conversationId))
          // then
          .rejects.toThrow(NhsNumberNotFoundError);
    });
  });

  describe('registrationRequestExistsWithMessageId', () => {
    it('should return true if a registration request is found, given a valid messageId', async () => {
      // given
      const conversationId = 'c511e4dd-f278-4a9d-ad2d-1ac547e9f990';
      const messageId = 'cb702eef-62e9-4636-a172-2535a0a02508';
      const odsCode = 'B23456';
      const nhsNumber = '1247415214'
      const status = Status.REGISTRATION_REQUEST_RECEIVED

      // when
      await createRegistrationRequest(conversationId, nhsNumber, messageId, odsCode);

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
