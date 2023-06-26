import { v4 as uuid } from 'uuid';
import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/registration-request';
import {
  getNhsNumberByConversationId,
  getRegistrationRequestStatusByConversationId, registrationRequestExistsWithMessageId,
  updateRegistrationRequestStatus
} from '../registration-request-repository';
import { NhsNumberNotFoundError } from "../../../errors/errors";
import { createRegistrationRequest } from "../create-registration-request";

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
    const messageId = uuid();
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
    const nonExistentConversationId = uuid();

    // when
    const registrationRequest = await getRegistrationRequestStatusByConversationId(
      nonExistentConversationId
    );

    // then
    expect(registrationRequest).toBe(null);
  });

  it('should change registration request status to invalid_ods_code', async () => {
    // given
    const conversationId = 'e30d008e-0134-479c-bf59-6d4978227617';
    const messageId = uuid();
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
      const conversationId = uuid();
      const messageId = uuid();
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
      const conversationId = uuid();

      // when
      await expect(getNhsNumberByConversationId(conversationId))
          // then
          .rejects.toThrow(NhsNumberNotFoundError);
    });
  });

  describe('registrationRequestExistsWithMessageId', () => {
    it('should return true if a registration request is found, given a valid messageId', async () => {
      // given
      const conversationId = uuid();
      const messageId = uuid();
      const odsCode = 'B23456';
      const nhsNumber = '1247415214'
      const status = Status.REGISTRATION_REQUEST_RECEIVED

      // when
      await createRegistrationRequest(conversationId, nhsNumber, messageId, odsCode);

      const foundRecord = await registrationRequestExistsWithMessageId(messageId);

      // then
      expect(foundRecord).not.toBeNull();
      expect(foundRecord).toEqual(true);
    });

    it('should return false if a registration request is not found, given an non-existent messageId', async () => {
      // given
      const nonExistentMessageId = uuid();

      // when
      const foundRecord = await registrationRequestExistsWithMessageId(nonExistentMessageId);

      // then
      expect(foundRecord).not.toBeNull();
      expect(foundRecord).toEqual(false);
    });
  });
});
