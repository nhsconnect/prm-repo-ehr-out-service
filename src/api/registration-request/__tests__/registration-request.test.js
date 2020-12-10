import request from 'supertest';
import { buildTestApp } from '../../../__builders__/testApp';
import { logError, logEvent } from '../../../middleware/logging';
import { createRegistrationRequest } from '../../../services/database/create-registration-request';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../../../services/database/registration-request-repository';
import { getPdsOdsCode } from '../../../services/gp2gp/pds-retrieval-request';
import { getPatientHealthRecordFromRepo } from '../../../services/ehr-repo/get-health-record';
import { Status } from '../../../models/registration-request';
import { initializeConfig } from '../../../config';
import { registrationRequests } from '../index';

jest.mock('../../../services/database/registration-request-repository');
jest.mock('../../../services/database/create-registration-request');
jest.mock('../../../services/gp2gp/pds-retrieval-request');
jest.mock('../../../services/ehr-repo/get-health-record');
jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));

describe('POST /registration-requests/', () => {
  const testApp = buildTestApp('/registration-requests', registrationRequests);
  initializeConfig.mockReturnValue({
    repoToGpServiceUrl: 'test-url',
    repoToGpAuthKeys: 'correct-key'
  });

  const conversationId = '5BB36755-279F-43D5-86AB-DEFEA717D93F';
  const conversationIdUuidv1 = '817db238-3adf-11eb-adc1-0242ac120002';
  const odsCode = 'A12345';
  const nhsNumber = '1111111111';
  const mockBody = {
    data: {
      type: 'registration-requests',
      id: conversationId,
      attributes: {
        nhsNumber: nhsNumber,
        odsCode: odsCode
      }
    }
  };

  const mockBodyUuidV1 = {
    data: {
      type: 'registration-requests',
      id: conversationIdUuidv1,
      attributes: {
        nhsNumber: nhsNumber,
        odsCode: odsCode
      }
    }
  };

  describe('success', () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValue(null);
    getPdsOdsCode.mockResolvedValue(odsCode);
    getPatientHealthRecordFromRepo.mockResolvedValue(true);

    it('should return a 204 if nhsNumber, odsCode, type, conversationId are provided', async () => {
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(204);
    });

    it('should return a 204 if Authorization Header is provided', async () => {
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.request.header['Authorization']).toBe('correct-key');
      expect(res.statusCode).toBe(204);
    });

    it('should return a 204 with a conversation Id that is uuidv1', async () => {
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBodyUuidV1);

      expect(res.statusCode).toBe(204);
    });

    it('should call createRegistrationRequest and return 204 if the request is correct', async () => {
      createRegistrationRequest.mockResolvedValue();
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(204);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
    });

    it('should updateRegistrationRequestStatus and log event if the request is correct', async () => {
      createRegistrationRequest.mockResolvedValue();
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(204);
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
        conversationId,
        Status.VALIDATION_CHECKS_PASSED
      );
      expect(logEvent).toHaveBeenCalledWith(`Validation checks passed`, {
        nhsNumber,
        conversationId
      });
    });

    it('should return location header for the created resource', async () => {
      createRegistrationRequest.mockResolvedValue();
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.header['location']).toEqual(`test-url/registration-requests/${conversationId}`);
      expect(res.statusCode).toBe(204);
    });
  });

  it('should return a 503 if createRegistrationRequest promise is rejected', async () => {
    createRegistrationRequest.mockRejectedValueOnce({});
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(503);
    expect(logError).toHaveBeenCalledWith('Registration request failed', {});
    expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
  });

  it('should return a 401 if Authorization Header is not provided', async () => {
    const res = await request(testApp).post('/registration-requests/').send(mockBody);

    expect(res.request.header['Authorization']).toBeUndefined();
    expect(res.statusCode).toBe(401);
  });

  it('should return a 409 and error message if registration is already in progress and update logs', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce({
      conversationId,
      status: Status.REGISTRATION_REQUEST_RECEIVED
    });
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      error: `Registration request with this ConversationId is already in progress`
    });
    expect(logEvent).toHaveBeenCalledWith(`Duplicate registration request`, {
      nhsNumber,
      conversationId
    });
  });

  it('should return 204, log event and call updateRegistrationRequestStatus when patients ODS Code in PDS does not match requester', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getPdsOdsCode.mockResolvedValueOnce('B1234');
    const incorrectOdsCodeStatus = Status.INCORRECT_ODS_CODE;
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(204);
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
      conversationId,
      incorrectOdsCodeStatus
    );
    expect(
      logEvent
    ).toHaveBeenCalledWith(
      'Patients ODS Code in PDS does not match requesting practices ODS Code',
      { nhsNumber, conversationId }
    );
  });

  it('should return 204, log event and call updateRegistrationRequestStatus when patient is not stored in repo', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getPatientHealthRecordFromRepo.mockResolvedValueOnce(false);
    const patientMissingStatus = Status.MISSING_FROM_REPO;
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(204);
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
      conversationId,
      patientMissingStatus
    );
    expect(logEvent).toHaveBeenCalledWith(
      `Patient does not have a complete health record in repo`,
      { nhsNumber, conversationId }
    );
  });

  describe('validations', () => {
    it('should return an error if :nhsNumber is less than 10 digits', async () => {
      const errorMessage = [
        { 'data.attributes.nhsNumber': "'nhsNumber' provided is not 10 characters" }
      ];
      const mockBody = {
        data: {
          type: 'registration-requests',
          id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
          attributes: {
            nhsNumber: '111111',
            odsCode: 'A12345'
          }
        }
      };
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if :nhsNumber is not numeric', async () => {
      const errorMessage = [{ 'data.attributes.nhsNumber': "'nhsNumber' provided is not numeric" }];
      const mockBody = {
        data: {
          type: 'registration-requests',
          id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
          attributes: {
            nhsNumber: 'xxxxxxxxxx',
            odsCode: 'A12345'
          }
        }
      };
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if :conversationId is not uuid', async () => {
      const errorMessage = [{ 'data.id': "'conversationId' provided is not of type UUID" }];
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ data: { ...mockBody.data, id: 'not-a-uuid' } });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if type is not valid', async () => {
      const errorMessage = [{ 'data.type': 'Invalid value' }];
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ data: { ...mockBody.data, type: 'invalid-type' } });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });
  });
});
