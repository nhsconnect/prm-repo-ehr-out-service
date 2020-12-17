import request from 'supertest';
import { v4 } from 'uuid';
import { initializeConfig } from '../../config';
import { createRegistrationRequest } from '../../services/database/create-registration-request';
import { buildTestApp } from '../../__builders__/testApp';
import { registrationRequests } from '../../api/registration-request';
import { getRegistrationRequestStatusByConversationId } from '../../services/database/registration-request-repository';
import { getPdsOdsCode } from '../../services/gp2gp/pds-retrieval-request';
import { getPatientHealthRecordFromRepo } from '../../services/ehr-repo/get-health-record';

jest.mock('../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../services/database/create-registration-request');
jest.mock('../../services/database/registration-request-repository');
jest.mock('../../services/gp2gp/pds-retrieval-request');
jest.mock('../../services/ehr-repo/get-health-record');
jest.mock('../../middleware/logging');

describe('auth', () => {
  const testApp = buildTestApp('/registration-requests', registrationRequests);
  const odsCode = 'A12345';
  const currentEhr = 'fake-url';
  const ehrRequestId = v4();

  it('should return HTTP 204 when correctly authenticated', async () => {
    initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });
    getRegistrationRequestStatusByConversationId.mockResolvedValue(null);
    getPdsOdsCode.mockResolvedValue({ data: { data: { odsCode } } });
    getPatientHealthRecordFromRepo.mockResolvedValue({ currentEhr });
    createRegistrationRequest.mockResolvedValue();

    const body = {
      data: {
        type: 'registration-requests',
        id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
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

  it('should return 412 if repoToGpAuthKeys have not been set', async () => {
    initializeConfig.mockReturnValue({});
    const errorMessage = {
      error: 'Server-side Authorization keys have not been set, cannot authenticate'
    };

    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key');

    expect(res.statusCode).toBe(412);
    expect(res.body).toEqual(errorMessage);
  });

  it('should return HTTP 401 when no authorization header provided', async () => {
    initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });
    const errorMessage = {
      error: 'The request (/registration-requests) requires a valid Authorization header to be set'
    };

    const res = await request(testApp).post('/registration-requests/');

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(errorMessage);
  });

  it('should return HTTP 403 when authorization key is incorrect', async () => {
    initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });
    const errorMessage = { error: 'Authorization header is provided but not valid' };

    const res = await request(testApp)
      .post('/registration-requests/')
      .set('Authorization', 'incorrect-key');

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual(errorMessage);
  });
});
