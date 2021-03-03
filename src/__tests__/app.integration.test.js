import request from 'supertest';
import { v4 } from 'uuid';
import nock from 'nock';
import app from '../app';
import { initializeConfig } from '../config';
import ModelFactory from '../models';
import { modelName, Status } from '../models/registration-request';

const localhostUrl = 'http://localhost';
const fakeAuth = 'fake-keys';

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
  const conversationId = v4();
  const nhsNumber = '1234567891';
  const odsCode = 'B12345';
  const status = Status.REGISTRATION_REQUEST_RECEIVED;

  beforeEach(() => {
    process.env.AUTHORIZATION_KEYS = fakeAuth;
  });

  afterEach(() => {
    delete process.env.AUTHORIZATION_KEYS;
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
  });

  it('should return 404 when registration request cannot be found', async () => {
    const nonExistentConversationId = '941ca257-f88f-499b-8e13-f8a62e7fea7a';
    const res = await request(app)
      .get(`/registration-requests/${nonExistentConversationId}`)
      .set('Authorization', fakeAuth);

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /registration-requests/', () => {
  const conversationId = v4();
  const nhsNumber = '1234567890';
  const odsCode = 'A12345';
  const ehrRequestId = v4();
  const repoToGpUrl = 'http://repo-to-gp';
  const currentEhr = 'fake-url';
  const ehrHeaders = { reqheaders: { Authorization: fakeAuth } };
  const gp2gpHeaders = { reqheaders: { Authorization: fakeAuth } };
  const pdsResponseBody = { data: { odsCode } };
  const ehrResponseBody = {
    data: {
      id: nhsNumber,
      type: 'patients',
      links: {
        healthRecordExtract: currentEhr,
        attachments: []
      }
    }
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
        currentEhrUrl: currentEhr
      }
    }
  };

  beforeEach(() => {
    process.env.SERVICE_URL = repoToGpUrl;
    process.env.AUTHORIZATION_KEYS = fakeAuth;
    process.env.GP2GP_ADAPTOR_SERVICE_URL = localhostUrl;
    process.env.GP2GP_ADAPTOR_AUTHORIZATION_KEYS = fakeAuth;
    process.env.EHR_REPO_SERVICE_URL = localhostUrl;
    process.env.EHR_REPO_AUTHORIZATION_KEYS = fakeAuth;
  });

  afterEach(() => {
    delete process.env.AUTHORIZATION_KEYS;
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
      `${repoToGpUrl}/registration-requests/${conversationId}`
    );
    expect(res.statusCode).toBe(204);

    const statusUpdate = await request(app)
      .get(`/registration-requests/${conversationId}`)
      .set('Authorization', fakeAuth);

    expect(statusUpdate.body.data.attributes.status).toEqual('sent_ehr');
  });
});
