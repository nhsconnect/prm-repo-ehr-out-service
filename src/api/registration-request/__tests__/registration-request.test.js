import request from 'supertest';
import { buildTestApp } from '../../../__builders__/test-app';
import { logError, logInfo } from '../../../middleware/logging';
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
import { sendEhrExtract } from '../../../services/gp2gp/send-ehr-extract';

jest.mock('../../../services/database/registration-request-repository');
jest.mock('../../../services/database/create-registration-request');
jest.mock('../../../services/gp2gp/pds-retrieval-request');
jest.mock('../../../services/gp2gp/send-ehr-extract');
jest.mock('../../../services/ehr-repo/get-health-record');
jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));

describe('POST /registration-requests/', () => {
  const testApp = buildTestApp('/registration-requests', registrationRequests);
  initializeConfig.mockReturnValue({
    repoToGpServiceUrl: 'test-url',
    consumerApiKeys: { TEST: 'correct-key' }
  });

  const conversationId = '5bb36755-279f-43d5-86ab-defea717d93f';
  const conversationIdUuidv1 = '817db238-3adf-11eb-adc1-0242ac120002';
  const ehrRequestId = '870f6ef9-746f-4e81-b51f-884d64530bed';
  const odsCode = 'A12345';
  const nhsNumber = '1111111111';
  const coreEhrMessageUrl = 'fake-url';
  const mockBody = {
    data: {
      type: 'registration-requests',
      id: conversationId,
      attributes: {
        nhsNumber,
        odsCode,
        ehrRequestId
      }
    }
  };

  describe('success', () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValue(null);
    getPdsOdsCode.mockResolvedValue(odsCode);
    getPatientHealthRecordFromRepo.mockResolvedValue({ coreEhrMessageUrl });

    it('should return a 204 when all values are provided and should call validation functions correctly', async () => {
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(204);
      expect(getRegistrationRequestStatusByConversationId).toHaveBeenCalledWith(conversationId);
      expect(getPatientHealthRecordFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(getPdsOdsCode).toHaveBeenCalledWith(nhsNumber);
      expect(sendEhrExtract).toHaveBeenCalledWith(
        conversationId,
        odsCode,
        ehrRequestId,
        coreEhrMessageUrl
      );
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, Status.SENT_EHR);
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
        .send({ data: { ...mockBody.data, id: conversationIdUuidv1 } });

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
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, Status.SENT_EHR);
      expect(logInfo).toHaveBeenCalledWith(`EHR has been successfully sent`);
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
    expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', {});
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
      error: `EHR out transfer with this conversation ID is already in progress`
    });
    expect(logInfo).toHaveBeenCalledWith('Duplicate transfer out request');
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
    expect(sendEhrExtract).not.toHaveBeenCalled();
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
      conversationId,
      incorrectOdsCodeStatus
    );
    expect(logInfo).toHaveBeenCalledWith(
      'Patients ODS Code in PDS does not match requesting practices ODS Code'
    );
  });

  it('should return 204, log event and call updateRegistrationRequestStatus when patient is not stored in repo', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getPatientHealthRecordFromRepo.mockResolvedValueOnce(null);
    const patientMissingStatus = Status.MISSING_FROM_REPO;
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(204);
    expect(getPdsOdsCode).not.toHaveBeenCalled();
    expect(sendEhrExtract).not.toHaveBeenCalled();
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
      conversationId,
      patientMissingStatus
    );
    expect(logInfo).toHaveBeenCalledWith(`Patient does not have a complete health record in repo`);
  });

  describe('validations', () => {
    it('should return an error if :nhsNumber is less than 10 digits', async () => {
      const errorMessage = [
        { 'data.attributes.nhsNumber': "'nhsNumber' provided is not 10 characters" }
      ];
      const mockBody = {
        data: {
          type: 'registration-requests',
          id: '5bb36755-279f-43d5-86ab-defea717d93f',
          attributes: {
            nhsNumber: '111111',
            odsCode,
            ehrRequestId
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
          id: '5bb36755-279f-43d5-86ab-defea717d93f',
          attributes: {
            nhsNumber: 'xxxxxxxxxx',
            odsCode,
            ehrRequestId
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

    it('should return an error if :ehrRequestId is not uuid', async () => {
      const errorMessage = [
        { 'data.attributes.ehrRequestId': "'ehrRequestId' provided is not of type UUID" }
      ];
      const mockBody = {
        data: {
          type: 'registration-requests',
          id: '5bb36755-279f-43d5-86ab-defea717d93f',
          attributes: {
            nhsNumber,
            odsCode,
            ehrRequestId: 'xxxxx'
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
