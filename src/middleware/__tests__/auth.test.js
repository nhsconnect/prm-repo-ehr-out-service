import request from 'supertest';
import app from '../../app';
import { initializeConfig } from '../../config';
import { createRegistrationRequest } from '../../services/database/create-registration-request';

jest.mock('../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../services/database/create-registration-request');

describe('auth', () => {
  it('should return HTTP 204 when correctly authenticated', async () => {
    initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });
    createRegistrationRequest.mockResolvedValue();

    const body = {
      data: {
        type: 'registration-requests',
        id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
        attributes: {
          nhsNumber: '1111111111',
          odsCode: 'A12345'
        }
      }
    };
    const res = await request(app)
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

    const res = await request(app)
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

    const res = await request(app).post('/registration-requests/');

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(errorMessage);
  });

  it('should return HTTP 403 when authorization key is incorrect', async () => {
    initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });
    const errorMessage = { error: 'Authorization header is provided but not valid' };

    const res = await request(app)
      .post('/registration-requests/')
      .set('Authorization', 'incorrect-key');

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual(errorMessage);
  });
});
