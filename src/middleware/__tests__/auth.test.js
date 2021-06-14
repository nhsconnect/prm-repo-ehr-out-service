import request from 'supertest';
import { v4 } from 'uuid';
import { initializeConfig } from '../../config';
import { createRegistrationRequest } from '../../services/database/create-registration-request';
import { buildTestApp } from '../../__builders__/test-app';
import { registrationRequests } from '../../api/registration-request';
import { getRegistrationRequestStatusByConversationId } from '../../services/database/registration-request-repository';
import { getPdsOdsCode } from '../../services/gp2gp/pds-retrieval-request';
import { getPatientHealthRecordFromRepo } from '../../services/ehr-repo/get-health-record';
import { logInfo, logWarning } from '../logging';

jest.mock('../../services/database/create-registration-request');
jest.mock('../../services/database/registration-request-repository');
jest.mock('../../services/gp2gp/pds-retrieval-request');
jest.mock('../../services/ehr-repo/get-health-record');
jest.mock('../../middleware/logging');
jest.mock('../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({
    sequelize: { dialect: 'postgres' },
    consumerApiKeys: {
      TEST_USER: 'correct-key',
      DUPLICATE_TEST_USER: 'correct-key',
      USER_2: 'key_2'
    }
  })
}));

describe('auth', () => {
  const testApp = buildTestApp('/registration-requests', registrationRequests);
  const odsCode = 'A12345';
  const currentEhr = 'fake-url';
  const ehrRequestId = v4();

  describe('authenticated successfully', () => {
    it('should return HTTP 204 when correctly authenticated', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValue(null);
      getPdsOdsCode.mockResolvedValue({ data: { data: { odsCode } } });
      getPatientHealthRecordFromRepo.mockResolvedValue({ currentEhr });
      createRegistrationRequest.mockResolvedValue();

      const body = {
        data: {
          type: 'registration-requests',
          id: '5bb36755-279f-43d5-86ab-defea717d93f',
          attributes: {
            nhsNumber: '1111111111',
            odsCode,
            ehrRequestId
          }
        }
      };
      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(body);

      expect(res.statusCode).toBe(204);
    });
  });

  describe('consumerApiKeys environment variables not provided', () => {
    it('should return 412 with an explicit error message if repoToGpAuthKeys have not been set', async () => {
      initializeConfig.mockReturnValueOnce({ consumerApiKeys: {} });
      const errorMessage = {
        error: 'Server-side Authorization keys have not been set, cannot authenticate'
      };

      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key');

      expect(res.statusCode).toBe(412);
      expect(res.body).toEqual(errorMessage);
    });
  });

  describe('Authorization header not provided', () => {
    it('should return HTTP 401 with an explicit error message when no authorization header provided', async () => {
      const errorMessage = {
        error:
          'The request (/registration-requests) requires a valid Authorization header to be set'
      };

      const res = await request(testApp).post('/registration-requests/');

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorMessage);
    });
  });

  describe('Incorrect Authorisation header value provided ', () => {
    it('should return HTTP 403 with an explicit error message when authorization key is incorrect', async () => {
      const errorMessage = { error: 'Authorization header is provided but not valid' };

      const res = await request(testApp)
        .post('/registration-requests/')
        .set('Authorization', 'incorrect-key');

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual(errorMessage);
    });
  });

  describe('Auth logging', () => {
    it('should log consumer, method and url for correctly authenticated request', async () => {
      const logMessage = 'Consumer: USER_2, Request: POST /registration-requests/';
      await request(testApp).post('/registration-requests/').set('Authorization', 'key_2');

      expect(logInfo).toHaveBeenCalledWith(logMessage);
    });

    it('should log multiple consumers when they use the same key value', async () => {
      const logMessage =
        'Consumer: TEST_USER/DUPLICATE_TEST_USER, Request: POST /registration-requests/';
      await request(testApp).post('/registration-requests/').set('Authorization', 'correct-key');

      expect(logInfo).toHaveBeenCalledWith(logMessage);
    });

    it('should log the method, url and partial api key when a request is unsuccessful', async () => {
      const logMessage = 'Unsuccessful Request: POST /registration-requests/, API Key: ******key';
      await request(testApp).post('/registration-requests/').set('Authorization', 'incorrect-key');

      expect(logWarning).toHaveBeenCalledWith(logMessage);
    });
  });
});
