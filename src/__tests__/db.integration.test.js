import { v4 as uuid } from 'uuid';
import ModelFactory from '../models';
import { modelName as messageFragmentModel } from '../models/message-fragment';
import { modelName as registrationRequestModel } from '../models/registration-request';
import { modelName as messageIdReplacementModel } from "../models/message-id-replacement";
import { readFile } from './utilities/integration-test.utilities';
import {
  updateFragmentMessageId
} from '../services/transfer/transfer-out-util';
import {
  getFragment,
  retrieveIdsFromEhrRepo
} from '../services/ehr-repo/get-fragment';
import { transferOutFragments } from '../services/transfer/transfer-out-fragments';
import { createRegistrationRequest } from '../services/database/create-registration-request';
import { logger } from "../config/logging";
import { createMessageIdReplacement } from "../services/database/create-message-id-replacement";
import nock from "nock";
import { config } from "../config";

jest.mock('../services/ehr-repo/get-fragment');
jest.mock('../services/transfer/transfer-out-util');

describe('Database connection test', () => {
  // ============ COMMON PROPERTIES ============
  // Database Models
  const MessageFragment = ModelFactory.getByName(messageFragmentModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);
  const MessageIdReplacement = ModelFactory.getByName(messageIdReplacementModel);

  // Nocking related setup.
  const { gp2gpMessengerAuthKeys, gp2gpMessengerServiceUrl} = config();
  const gp2gpMessengerEndpointUrl = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/fragment`;
  const gp2gpMessengerHeaders = { headers: { Authorization: gp2gpMessengerAuthKeys } };

  const gp2gpAuth = 'gp2gp-auth';
  const gp2gpUrl = 'http://fake-gp2gpmessager-url';
  const gp2gpHeaders = { reqheaders: { authorization: auth => auth === gp2gpAuth } };

  let originalLoggerLevel;
  // =================== END ===================

  beforeAll(async () => {
    process.env.GP2GP_MESSENGER_SERVICE_URL = gp2gpUrl;
    process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS = gp2gpAuth;
    await MessageFragment.truncate();
    await RegistrationRequest.truncate();
    await MessageIdReplacement.truncate();
    await MessageFragment.sync({ force: true });
    await RegistrationRequest.sync({ force: true });
    await MessageIdReplacement.sync({ force: true });

    originalLoggerLevel = logger.level;
    logger.level = "warn";
  });

  afterAll(async () => {
    logger.level = originalLoggerLevel;
    await MessageFragment.sequelize.sync({ force: true });
    await RegistrationRequest.sequelize.sync({ force: true });
    await MessageIdReplacement.sequelize.sync({ force: true });

    await ModelFactory.sequelize.close();
  });

  it('should verify that the database connection pool is able to handle 100 fragments at once', async () => {
    // given
    const odsCode = "B85002";
    const nhsNumber = 9693796047;
    const numberOfFragments = 100;
    const messageId = "D2D446C0-B5DC-4434-9D62-863CDB7BE4E7";
    const conversationId = "AA54D21B-3B4B-4E6D-86DE-98368F46D9F5";
    const singleFragment = readFile('COPC_IN000001UK01_01', 'equality-test', 'large-ehr-with-external-attachments', 'original');
    const fragmentMessageIds = Array(numberOfFragments).fill(null).map(() => uuid().toUpperCase());
    const fragmentsWithMessageIds = {};
    const dummyBaseUrl = "http://localhost"
    const sendFragmentEndpoint = "/ehr-out-transfers/fragment";
    fragmentMessageIds.forEach(fragmentId => fragmentsWithMessageIds[fragmentId] = singleFragment);

    // when
    await createRegistrationRequest(conversationId, messageId, nhsNumber, odsCode);

    for (let oldFragmentMessageId of fragmentMessageIds) {
      const newFragmentMessageId = oldFragmentMessageId.slice(0, 35) + '0';
      await createMessageIdReplacement(oldFragmentMessageId, newFragmentMessageId);
      getFragment.mockResolvedValueOnce((JSON.parse(fragmentsWithMessageIds[oldFragmentMessageId])));
      updateFragmentMessageId.mockResolvedValueOnce({
        newMessageId: newFragmentMessageId ,
        message: JSON.parse(fragmentsWithMessageIds[oldFragmentMessageId])
      });
    }

    retrieveIdsFromEhrRepo.mockResolvedValueOnce({
      conversationIdFromEhrIn: conversationId,
      messageIds: fragmentMessageIds
    });

    const gp2gpMessengerSendFragmentScope = nock(gp2gpUrl, gp2gpHeaders)
        .persist()
        .post('/ehr-out-transfers/fragment')
        .reply(204);

    await transferOutFragments({
      conversationId: conversationId,
      nhsNumber: nhsNumber,
      odsCode: odsCode
    });

    // then
    expect(gp2gpMessengerSendFragmentScope.isDone()).toBe(true);
    expect(await RegistrationRequest.count()).toEqual(1);
    expect(await MessageIdReplacement.count()).toEqual(numberOfFragments);
    expect(await MessageFragment.count()).toEqual(numberOfFragments);
  });
});