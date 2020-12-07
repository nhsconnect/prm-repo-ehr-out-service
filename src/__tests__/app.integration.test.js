import request from 'supertest';
import app from '../app';
import { initializeConfig } from '../config';
import ModelFactory from '../models';
import { modelName, Status } from '../models/registration-request';
import { getPdsPatientDetails } from '../services/gp2gp/pds-retrieval-request';

jest.mock('../services/gp2gp/pds-retrieval-request');

describe('GET /health', () => {
  const config = initializeConfig();

  it('should return 200 and the response from getHealthCheck', async () => {
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

    const res = await request(app).get(`/health`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expectedHealthCheckResponse);
  });
});

describe('Swagger Documentation', () => {
  it('GET /swagger - should return a redirect 301 status code and text/html content type response', async () => {
    const res = await request(app).get(`/swagger`);

    expect(res.statusCode).toBe(301);
  });

  it('GET /swagger/index.html - should return a 200 status code and text/html content type response', async () => {
    const res = await request(app).get(`/swagger/index.html`);

    expect(res.statusCode).toBe(200);
  });
});

describe('GET /registration-requests/:conversationId', () => {
  const config = initializeConfig();
  const conversationId = '798d3574-635f-447b-8ff0-a41a95d951db';
  const nhsNumber = '1234567891';
  const odsCode = 'B12345';
  const status = Status.REGISTRATION_REQUEST_RECEIVED;

  it('should return registration request info', async () => {
    const retrievalResponse = {
      data: {
        type: 'registration-requests',
        id: conversationId,
        attributes: {
          nhsNumber,
          odsCode,
          status
        }
      }
    };

    const RegistrationRequest = ModelFactory.getByName(modelName);
    await RegistrationRequest.create({
      conversationId,
      nhsNumber,
      status,
      odsCode
    });

    const res = await request(app)
      .get(`/registration-requests/${conversationId}`)
      .set('Authorization', config.repoToGpAuthKeys);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(retrievalResponse);
  });

  it('should return 404 when registration request cannot be found', async () => {
    const nonExistentConversationId = '941ca257-f88f-499b-8e13-f8a62e7fea7a';
    const res = await request(app)
      .get(`/registration-requests/${nonExistentConversationId}`)
      .set('Authorization', config.repoToGpAuthKeys);

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /registration-requests/', () => {
  const config = initializeConfig();
  const conversationId = 'ed354a0d-be71-4026-804a-4674ca6cdd17';
  const nhsNumber = '1234567890';
  const odsCode = 'A12345';

  it('should return a 204 status code for correct request', async () => {
    getPdsPatientDetails.mockResolvedValue({ data: { data: { odsCode } } });
    const body = {
      data: {
        type: 'registration-requests',
        id: conversationId,
        attributes: {
          nhsNumber,
          odsCode
        }
      }
    };

    const res = await request(app)
      .post(`/registration-requests/`)
      .set('Authorization', config.repoToGpAuthKeys)
      .send(body);

    expect(res.header[`location`]).toEqual(
      `${config.repoToGpServiceUrl}/deduction-requests/${conversationId}`
    );
    expect(res.statusCode).toBe(204);
  });
});
