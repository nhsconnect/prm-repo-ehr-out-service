import request from 'supertest';
import { v4 } from 'uuid';
import nock from 'nock';
import app from '../app';
import { initializeConfig } from '../config';
import ModelFactory from '../models';
import { modelName, Status } from '../models/registration-request';
import { logger } from '../config/logging';
import { expectStructuredLogToContain, transportSpy } from '../__builders__/logging-helper';

const localhostUrl = 'http://localhost';
const fakeAuth = 'fake-keys';

describe('GET /health', () => {
  const config = initializeConfig();

  it('should return 200 and the response from getHealthCheck', async () => {
    const expectedHealthCheckResponse = {
      version: '1',
      description: 'Health of ehr-out-service',
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
  const conversationId = v4();
  const nhsNumber = '1234567891';
  const odsCode = 'B12345';
  const status = Status.REGISTRATION_REQUEST_RECEIVED;

  beforeEach(() => {
    logger.add(transportSpy);
    process.env.API_KEY_FOR_TEST = fakeAuth;
  });

  afterEach(() => {
    delete process.env.API_KEY_FOR_TEST;
  });

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
      .set('Authorization', fakeAuth);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(retrievalResponse);
    expectStructuredLogToContain(transportSpy, {
      conversationId: conversationId
    });
  });

  it('should return 404 when registration request cannot be found', async () => {
    const nonExistentConversationId = '941ca257-f88f-499b-8e13-f8a62e7fea7a';
    const res = await request(app)
      .get(`/registration-requests/${nonExistentConversationId}`)
      .set('Authorization', fakeAuth);

    expect(res.statusCode).toBe(404);
    expectStructuredLogToContain(transportSpy, {
      conversationId: nonExistentConversationId
    });
  });
});

describe('POST /registration-requests/', () => {
  const conversationId = v4();
  const conversationIdFromEhrIn = v4();
  const nhsNumber = '1234567890';
  const odsCode = 'A12345';
  const ehrRequestId = v4();
  const serviceUrl = 'http://ehr-out-service';
  const coreMessageUrl = 'fake-url';
  const fragmentMessageIds = [];
  const ehrHeaders = { reqheaders: { Authorization: fakeAuth } };
  const gp2gpHeaders = { reqheaders: { Authorization: fakeAuth } };
  const pdsResponseBody = { data: { odsCode } };
  const ehrResponseBody = {
    coreMessageUrl,
    fragmentMessageIds,
    conversationIdFromEhrIn: conversationIdFromEhrIn
  };

  const sendEhrBody = {
    data: {
      type: 'health-record-transfers',
      id: conversationId,
      attributes: {
        odsCode,
        ehrRequestId
      },
      links: {
        currentEhrUrl: coreMessageUrl
      }
    }
  };

  beforeEach(() => {
    logger.add(transportSpy);

    process.env.SERVICE_URL = serviceUrl;
    process.env.API_KEY_FOR_TEST = fakeAuth;
    process.env.GP2GP_ADAPTOR_SERVICE_URL = localhostUrl;
    process.env.GP2GP_ADAPTOR_AUTHORIZATION_KEYS = fakeAuth;
    process.env.EHR_REPO_SERVICE_URL = localhostUrl;
    process.env.EHR_REPO_AUTHORIZATION_KEYS = fakeAuth;
  });

  afterEach(() => {
    delete process.env.API_KEY_FOR_TEST;
    delete process.env.GP2GP_ADAPTOR_SERVICE_URL;
    delete process.env.GP2GP_ADAPTOR_AUTHORIZATION_KEYS;
    delete process.env.EHR_REPO_SERVICE_URL;
    delete process.env.EHR_REPO_AUTHORIZATION_KEYS;
  });

  it('should return a 204 status code for correct request', async () => {
    nock(localhostUrl, ehrHeaders).get(`/patients/${nhsNumber}`).reply(200, ehrResponseBody);
    nock(localhostUrl, gp2gpHeaders)
      .get(`/patient-demographics/${nhsNumber}`)
      .reply(200, pdsResponseBody);
    nock(localhostUrl, gp2gpHeaders).post(`/health-record-transfers`, sendEhrBody).reply(204);

    const body = {
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

    const res = await request(app)
      .post(`/registration-requests/`)
      .set('Authorization', fakeAuth)
      .send(body);

    expect(res.header[`location`]).toEqual(
      `${serviceUrl}/registration-requests/${conversationId}`
    );
    expect(res.statusCode).toBe(204);

    const statusUpdate = await request(app)
      .get(`/registration-requests/${conversationId}`)
      .set('Authorization', fakeAuth);

    expect(statusUpdate.body.data.attributes.status).toEqual('sent_ehr');
    expectStructuredLogToContain(transportSpy, {
      conversationId: conversationId
    });
  });
});
