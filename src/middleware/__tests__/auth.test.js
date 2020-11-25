import request from 'supertest';
import app from '../../app';
import { initializeConfig } from '../../config';

jest.mock('../../config');

describe('auth', () => {
  it('should return HTTP 201 when correctly authenticated', async () => {
    initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });

    const res = await request(app)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send({
        nhsNumber: '0000000000',
        odsCode: 'ABC1234',
        conversationId: '0F76E284-31EB-4370-8BAE-07DBD92C3C9B'
      });

    expect(res.statusCode).toBe(201);
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
