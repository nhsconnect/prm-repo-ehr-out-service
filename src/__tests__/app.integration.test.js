import { agent as request } from 'supertest';
import { v4 } from 'uuid';
import app from '../app';
import { config } from '../config';
import { logger } from '../config/logging';
import { expectStructuredLogToContain, transportSpy } from '../__builders__/logging-helper';
import expect from "expect";
import { readFile, validateMessageEquality } from "./utilities/integration-test.utilities";
import { transferOutEhrCore } from "../services/transfer/transfer-out-ehr-core";
import ModelFactory from '../models';
import { modelName as registrationRequestModel, modelName, Status } from "../models/registration-request";
import { modelName as messageFragmentModel } from "../models/message-fragment";
import { modelName as messageIdReplacementModel } from "../models/message-id-replacement"
import { getEhrCoreAndFragmentIdsFromRepo } from "../services/ehr-repo/get-ehr";
import { patientAndPracticeOdsCodesMatch } from "../services/transfer/transfer-out-util";
import { sendCore } from "../services/gp2gp/send-core";
import { transferOutFragments } from "../services/transfer/transfer-out-fragments";
import { sendFragment } from "../services/gp2gp/send-fragment";
import { getAllFragmentsWithMessageIdsFromRepo } from "../services/ehr-repo/get-fragments";
import { createMessageIdReplacement } from "../services/database/create-message-id-replacement";

const fakeAuth = 'fake-keys';

// Setup mocking
jest.mock('../services/ehr-repo/get-ehr');
jest.mock('../services/transfer/transfer-out-util', () => {
  const originalModule = jest.requireActual('../services/transfer/transfer-out-util');

  return {
    __esModule: true,
    ...originalModule,
    patientAndPracticeOdsCodesMatch: jest.fn(),
    updateConversationStatus: jest.fn()
  }

});

jest.mock('../services/gp2gp/send-core');
jest.mock('../services/ehr-repo/get-fragments');
jest.mock('../services/gp2gp/send-fragment');

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

    const response = await request(app)
      .get(HEALTH_ENDPOINT);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expectedHealthCheckResponse);
  });
});

describe('Swagger Documentation', () => {
  // ============ COMMON PROPERTIES ============
  const SWAGGER_ENDPOINT_1 = '/swagger';
  const SWAGGER_ENDPOINT_2 = '/swagger/index.html';
  // =================== END ===================

  it('GET /swagger - should return a redirect 301 status code and text/html content type response', async () => {
    const res = await request(app).get(SWAGGER_ENDPOINT_1);
    expect(res.statusCode).toBe(301);
  });

  it('GET /swagger/index.html - should return a 200 status code and text/html content type response', async () => {
    const res = await request(app).get(SWAGGER_ENDPOINT_2);
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
    const messageId = v4();

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
      messageId,
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

describe('Ensure health record outbound XML is unchanged', () => {
  // ============ COMMON PROPERTIES ============
  // EHR Data
  const ODS_CODE = "B85002";

  // Database Models
  const MessageFragment = ModelFactory.getByName(messageFragmentModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);
  const MessageIdReplacement = ModelFactory.getByName(messageIdReplacementModel);

  // =================== END ===================

  beforeAll(async () => {
    await MessageFragment.truncate();
    await RegistrationRequest.truncate();
    await MessageIdReplacement.truncate();
    await MessageFragment.sync({ force: true });
    await RegistrationRequest.sync({ force: true });
    await MessageIdReplacement.sync({ force: true });
  });

  afterAll(async () => {
    await MessageFragment.sequelize.sync({ force: true });
    await RegistrationRequest.sequelize.sync({ force: true });
    await MessageIdReplacement.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should verify that a small EHR core is unchanged by XML changes', async () => {
    // given
    const NHS_NUMBER = 9693796047;
    const CONVERSATION_ID = "0005504B-C4D5-458A-83BD-3FA2CCAE650E";
    const EHR_REQUEST_ID = "A4709C25-DD61-4FED-A9ED-E35AA464A7B3";
    const ORIGINAL_EHR_CORE = readFile('RCMR_IN030000UK06', 'equality-test', 'small-ehr', 'original');
    const EHR_CORE_AND_FRAGMENT_IDS = { ehrCore: JSON.parse(ORIGINAL_EHR_CORE), fragmentMessageIds: []};

    // when
    getEhrCoreAndFragmentIdsFromRepo.mockReturnValueOnce(Promise.resolve(EHR_CORE_AND_FRAGMENT_IDS));
    patientAndPracticeOdsCodesMatch.mockReturnValue(Promise.resolve(true));
    sendCore.mockReturnValueOnce(Promise.resolve(undefined));

    await transferOutEhrCore({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE,
      ehrRequestId: EHR_REQUEST_ID
    });

    const MODIFIED_EHR_CORE = JSON.stringify(sendCore.mock.calls[0][2]);

    // then
    expect(validateMessageEquality(ORIGINAL_EHR_CORE, MODIFIED_EHR_CORE)).toBe(true);
  });

  it('should verify that a fragment with no external attachments is unchanged by xml changes', async () => {
    // given
    const NHS_NUMBER = 9693643038;
    const CONVERSATION_ID = "05E36C93-2DEF-4586-B842-127C534FB8B7";

    const ORIGINAL_FRAGMENTS = {
      'DD92589A-B5B4-4492-AADD-51534821F07B': readFile('COPC_IN000001UK01_01', 'equality-test', 'large-ehr-no-external-attachments', 'original'),
      'DE4A9436-FFA3-49B1-8180-5570510F0C11': readFile('COPC_IN000001UK01_02', 'equality-test', 'large-ehr-no-external-attachments', 'original'),
      '62330782-1C8B-45CD-95E3-4FC624091C61': readFile('COPC_IN000001UK01_03', 'equality-test', 'large-ehr-no-external-attachments', 'original'),
      '770C42DD-301B-4177-A78E-0E9E62F3FDA1': readFile('COPC_IN000001UK01_04', 'equality-test', 'large-ehr-no-external-attachments', 'original')
    };

    const MOCK_RETURN_VALUE_FOR_getAllFragmentsWithMessageIdsFromRepo = {}

    const FRAGMENT_MESSAGE_IDS = Object.keys(ORIGINAL_FRAGMENTS);

    for (let messageId of FRAGMENT_MESSAGE_IDS) {
      // parse the COPC fragment file to JS object and assign to the return value of mock function
      const fragmentFileAsString = ORIGINAL_FRAGMENTS[messageId];
      MOCK_RETURN_VALUE_FOR_getAllFragmentsWithMessageIdsFromRepo[messageId] = JSON.parse(fragmentFileAsString);

      // add records of the old message ids to database table
      // new message ids are mostly same as the old ones, with last char replaced as '0', in order to guarantee the .sort() at expect statement give the same order.
      await createMessageIdReplacement(messageId, messageId.slice(0, 35) + '0')
    }

    // when
    getAllFragmentsWithMessageIdsFromRepo.mockReturnValueOnce(
      Promise.resolve(MOCK_RETURN_VALUE_FOR_getAllFragmentsWithMessageIdsFromRepo)
    );
    sendFragment.mockResolvedValue(undefined);

    await transferOutFragments({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE,
    });

    // then
    const originalFragments = Object.values(ORIGINAL_FRAGMENTS).sort();
    const receivedArguments = [0, 1, 2, 3]
      .map(i => sendFragment.mock.calls[i][2])
      .map(jsObj => JSON.stringify((jsObj)))
      .sort()

    expect(sendFragment).toBeCalledTimes(4);
    expect(validateMessageEquality(originalFragments[0], receivedArguments[0])).toBe(true);
    expect(validateMessageEquality(originalFragments[1], receivedArguments[1])).toBe(true);
    expect(validateMessageEquality(originalFragments[2], receivedArguments[2])).toBe(true);
    expect(validateMessageEquality(originalFragments[3], receivedArguments[3])).toBe(true);
  });

  it('should verify that a fragment with external attachments is unchanged by xml changes', async () => {
    // given
    const NHS_NUMBER = 9693643038;
    const CONVERSATION_ID = "0346D9CC-F472-492A-86D4-43D8B73AC95D";
    const ORIGINAL_FRAGMENTS = {
      '060FA820-A231-11ED-808B-AC162D1F16F0': readFile('COPC_IN000001UK01_01', 'equality-test', 'large-ehr-with-external-attachments', 'original'),
      '063817B0-A231-11ED-808B-AC162D1F16F0': readFile('COPC_IN000001UK01_02', 'equality-test', 'large-ehr-with-external-attachments', 'original'),
      '0635CDC0-A231-11ED-808B-AC162D1F16F0': readFile('COPC_IN000001UK01_03', 'equality-test', 'large-ehr-with-external-attachments', 'original'),
      '0635CDC1-A231-11ED-808B-AC162D1F16F0': readFile('COPC_IN000001UK01_04', 'equality-test', 'large-ehr-with-external-attachments', 'original')
    }
    const MOCK_RETURN_VALUE_FOR_getAllFragmentsWithMessageIdsFromRepo = {}

    const FRAGMENT_MESSAGE_IDS = Object.keys(ORIGINAL_FRAGMENTS);

    for (let messageId of FRAGMENT_MESSAGE_IDS) {
      const fragmentFileAsString = ORIGINAL_FRAGMENTS[messageId];
      MOCK_RETURN_VALUE_FOR_getAllFragmentsWithMessageIdsFromRepo[messageId] = JSON.parse(fragmentFileAsString);

      await createMessageIdReplacement(messageId, messageId.slice(0, 35) + '1')
    }

    // when
    getAllFragmentsWithMessageIdsFromRepo.mockReturnValueOnce(Promise.resolve(MOCK_RETURN_VALUE_FOR_getAllFragmentsWithMessageIdsFromRepo));
    sendFragment.mockResolvedValue(undefined);

    await transferOutFragments({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE,
    });

    // then
    const originalFragments = Object.values(ORIGINAL_FRAGMENTS).sort();
    const receivedArguments = [0, 1, 2, 3]
      .map(i => sendFragment.mock.calls[i][2])
      .map(jsObj => JSON.stringify((jsObj)))
      .sort();

    expect(sendFragment).toBeCalledTimes(4);

    expect(validateMessageEquality(originalFragments[0], receivedArguments[0])).toBe(true);
    expect(validateMessageEquality(originalFragments[1], receivedArguments[1])).toBe(true);
    expect(validateMessageEquality(originalFragments[2], receivedArguments[2])).toBe(true);
    expect(validateMessageEquality(originalFragments[3], receivedArguments[3])).toBe(true);
  });
});