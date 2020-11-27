import request from 'supertest';
import app from '../app';
import { initializeConfig } from '../config';

describe('GET /health', () => {
  const config = initializeConfig();

  it('should return 200 and the response from getHealthCheck', done => {
    const expectedHealthCheckResponse = {
      version: '1',
      description: 'Health of Repo To GP service',
      nhsEnvironment: config.nhsEnvironment,
      details: {
        database: {
          type: 'postgresql',
          connection: true,
          writable: true
        }
      }
    };

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

describe('Swagger Documentation', () => {
  it('GET /swagger - should return a redirect 301 status code and text/html content type response', done => {
    request(app)
      .get('/swagger')
      .expect(301)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .end(done);
  });

  it('GET /swagger/index.html - should return a 200 status code and text/html content type response', done => {
    request(app)
      .get('/swagger/index.html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .end(done);
  });
});
