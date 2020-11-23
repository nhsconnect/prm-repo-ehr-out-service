import request from 'supertest';
import app from '../app';
import { initializeConfig } from '../config';

jest.mock('../config');

describe('GET /health', () => {
  it('should return 200 and the response from getHealthCheck', done => {
    const expectedHealthCheckResponse = {
      version: '1',
      description: 'Health of Repo To GP service',
      nodeEnv: 'local'
    };

    initializeConfig.mockReturnValue({ nodeEnv: 'local' });

    request(app)
      .get('/health')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual(expectedHealthCheckResponse);
      })
      .end(done);
  });
});
