import request from 'supertest';
import { buildTestApp } from '../../../__builders__/testApp';
import { logError } from '../../../middleware/logging';
import { createRegistrationRequest } from '../../../services/database/create-registration-request';
import { getRegistrationRequestStatusByConversationId, updateRegistrationRequestStatus } from '../../../services/database/registration-request-repository';
import { getPdsPatientDetails } from '../../../services/gp2gp/pds-retrieval-request';
import { Status } from '../../../models/registration-request';
import { initializeConfig } from '../../../config';
import { registrationRequests } from '../index';

jest.mock('../../../services/database/registration-request-repository');
jest.mock('../../../services/database/create-registration-request');
jest.mock('../../../services/gp2gp/pds-retrieval-request');
jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));

describe('POST /registration-requests/', () => {
  const testApp = buildTestApp('/registration-requests', registrationRequests);
  getRegistrationRequestStatusByConversationId.mockResolvedValue(null);
  initializeConfig.mockReturnValue({
    repoToGpServiceUrl: 'test-url',
    repoToGpAuthKeys: 'correct-key'
  });

  const conversationId = '5BB36755-279F-43D5-86AB-DEFEA717D93F';
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

  it('should call createRegistrationRequest and return 204 if the request is correct', async () => {
    createRegistrationRequest.mockResolvedValue();
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(204);
    expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
  });

  it('should return location header for the created resource', async () => {
    createRegistrationRequest.mockResolvedValue();
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.header['location']).toEqual(`test-url/deduction-requests/${conversationId}`);
    expect(res.statusCode).toBe(204);
  });

  it('should return a 503 if createRegistrationRequest promise is rejected', async () => {
    createRegistrationRequest.mockRejectedValue({});
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

  it('should return a 409 if registration is already in progress', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValue({
      conversationId,
      status: Status.REGISTRATION_REQUEST_RECEIVED
    });
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(409);
  });

  it('should return a 406 when patients ODS Code in PDS does not match requester', async () => {
    getPdsPatientDetails.mockResolvedValue({ data: { data: { odsCode: 'B1234' }}})
    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(406);
  });

  it('should call updateRegistrationRequestStatus when patients ODS Code in PDS does not match requester', async () => {
    getPdsPatientDetails.mockResolvedValue({ data: { data: { odsCode: 'B1234' }}})
    const invalidOdsCodeStatus = Status.INVALID_ODS_CODE;
    await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, invalidOdsCodeStatus);
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
      const errorMessage = [{ 'data.id': "'conversationId' provided is not of type UUIDv4" }];
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
