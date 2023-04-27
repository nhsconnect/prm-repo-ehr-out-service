import { agent as request } from 'supertest';
import { v4 } from 'uuid';
import nock from 'nock';
import app from '../app';
import { config } from '../config';
import ModelFactory from '../models';
import { modelName as registrationRequestModel, modelName, Status } from "../models/registration-request";
import { logger } from '../config/logging';
import { expectStructuredLogToContain, transportSpy } from '../__builders__/logging-helper';
import expect from "expect";
import { readFile, validateMessageEquality } from "./utilities/integration-test.utilities";
import { transferOutEhrCore } from "../services/transfer/transfer-out-ehr-core";
import { modelName as messageFragmentModel } from "../models/message-fragment";
import { getEhrCoreFromRepo } from "../services/ehr-repo/get-ehr";
import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../services/transfer/transfer-out-util";
import { sendCore } from "../services/gp2gp/send-core";

const EHR_OUT = 'http://localhost';
const fakeAuth = 'fake-keys';

// Setup mocking
jest.mock('../services/ehr-repo/get-ehr');
jest.mock('../services/transfer/transfer-out-util');
jest.mock('../services/gp2gp/send-core');

describe('GET /health', () => {
  // ============ COMMON PROPERTIES ============
  const HEALTH_ENDPOINT = '/health';
  const { nhsEnvironment } = config();
  // =================== END ===================

  it('should return 200 and the response from getHealthCheck', async () => {
    const expectedHealthCheckResponse = {
      version: '1',
      description: 'Health of ehr-out-service',
      nhsEnvironment: nhsEnvironment,
      details: {
        database: {
          type: 'postgresql',
          connection: true,
          writable: true
        }
      }
    };

    const response = request(app)
      .get(HEALTH_ENDPOINT);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expectedHealthCheckResponse);
  });
});

describe('Swagger Documentation', () => {
  // ============ COMMON PROPERTIES ============
  const SWAGGER_ENDPOINTS = [
    '/swagger',
    '/swagger/index.html'
  ];
  const { nhsEnvironment } = config();
  // =================== END ===================

  it('GET /swagger - should return a redirect 301 status code and text/html content type response', async () => {
    const res = await request(app).get(SWAGGER_ENDPOINTS[0]);
    expect(res.statusCode).toBe(301);
  });

  it('GET /swagger/index.html - should return a 200 status code and text/html content type response', async () => {
    const res = await request(app).get(SWAGGER_ENDPOINTS[1]);
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
    process.env.GP2GP_MESSENGER_SERVICE_URL = EHR_OUT;
    process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS = fakeAuth;
    process.env.EHR_REPO_SERVICE_URL = EHR_OUT;
    process.env.EHR_REPO_AUTHORIZATION_KEYS = fakeAuth;
  });

  afterEach(() => {
    delete process.env.API_KEY_FOR_TEST;
    delete process.env.GP2GP_MESSENGER_SERVICE_URL;
    delete process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS;
    delete process.env.EHR_REPO_SERVICE_URL;
    delete process.env.EHR_REPO_AUTHORIZATION_KEYS;
  });

  it('should return a 204 status code for correct request', async () => {
    nock(EHR_OUT, ehrHeaders).get(`/patients/${nhsNumber}`).reply(200, ehrResponseBody);
    nock(EHR_OUT, gp2gpHeaders)
      .get(`/patient-demographics/${nhsNumber}`)
      .reply(200, pdsResponseBody);
    nock(EHR_OUT, gp2gpHeaders).post(`/health-record-transfers`, sendEhrBody).reply(204);

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

describe('Ensure health record outbound XML is unchanged', () => {
  // ============ COMMON PROPERTIES ============
  // EHR Data
  const NHS_NUMBER = 9693796047;
  const ODS_CODE = "B85002";
  const CONVERSATION_ID = "0005504B-C4D5-458A-83BD-3FA2CCAE650E";
  const EHR_REQUEST_ID = "A4709C25-DD61-4FED-A9ED-E35AA464A7B3";
  const MESSAGE_ID = "F4491E41-D167-4FEC-9C8F-BDC6082C7F8B";

  // Database Models
  const MessageFragment = ModelFactory.getByName(messageFragmentModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);

  // Responses
  const DEFAULT_RESULT = {
    hasFailed: false,
    inProgress: false
  };
  // =================== END ===================

  beforeAll(async () => {
    await MessageFragment.truncate();
    await RegistrationRequest.truncate();
    await MessageFragment.sync({ force: true });
    await RegistrationRequest.sync({ force: true });
  })

  afterAll(async () => {
    await MessageFragment.sequelize.sync({ force: true });
    await RegistrationRequest.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should verify that a small EHR is unchanged by the xml changes', async () => {
    // given
    const ORIGINAL_UK06 = readFile('RCMR_IN030000UK06', 'equality-test', 'small-ehr', 'original');

    // when
    getEhrCoreFromRepo.mockResolvedValueOnce(Promise.resolve(ORIGINAL_UK06));
    patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(Promise.resolve(true));
    sendCore.mockResolvedValueOnce(Promise.resolve(undefined));

    const response = await transferOutEhrCore({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE,
      ehrRequestId: EHR_REQUEST_ID
    });

    const MODIFIED_UK06 = sendCore.mock.calls[0][2];

    // then
    expect(validateMessageEquality(ORIGINAL_UK06, MODIFIED_UK06)).toBe(true);
  });

  it('should verify that a large EHR and its fragments are unchanged by the xml changes', async () => {});
});