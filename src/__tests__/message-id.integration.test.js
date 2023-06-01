import nock from 'nock';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../config/logging';
import { transportSpy } from '../__builders__/logging-helper';
import ModelFactory from '../models';
import { modelName as messageIdReplacementModelName } from '../models/message-id-replacement';
import { modelName as registrationRequestModelName } from '../models/registration-request';
import { modelName as messageFragmentModelName } from '../models/message-fragment';
import { transferOutEhrCore } from '../services/transfer/transfer-out-ehr-core';
import {
  extractEbXmlData,
  extractReferencedFragmentMessageIds
} from '../services/parser/extract-eb-xml-data';
import { transferOutFragments } from '../services/transfer/transfer-out-fragments';
import { getNewMessageIdByOldMessageId } from '../services/database/message-id-replacement-repository';

describe('Replacement of message IDs', () => {
  // ============ COMMON PROPERTIES ============
  const gp2gpUrl = 'http://fake-gp2gpmessager-url';
  const gp2gpAuth = 'gp2gp-auth';
  const gp2gpHeaders = { reqheaders: { authorization: auth => auth === gp2gpAuth } };
  const ehrRepoUrl = 'http://fake-ehr-repo-url';
  const ehrRepoAuth = 'ehr-repo-auth';
  const ehrRepoHeaders = { reqheaders: { authorization: auth => auth === ehrRepoAuth } };

  const conversationId = uuidv4();
  const nhsNumber = '1234567890';
  const odsCode = 'fake-ods-code';
  const ehrRequestId = uuidv4();

  const coreMessageId = 'DF91D420-DDC7-11ED-808B-AC162D1F16F0';
  const fragmentMessageIds = [
    'DFBA6AC0-DDC7-11ED-808B-AC162D1F16F0',
    'DFEC7740-DDC7-11ED-808B-AC162D1F16F0',
    'DFEC7741-DDC7-11ED-808B-AC162D1F16F0',
    'DFF61430-DDC7-11ED-808B-AC162D1F16F0'
  ];
  const conversationIdFromEhrIn = '5037ae3a-0ce2-4f47-adb5-8fdd92e6f5a4';
  const ehrCorePresignedUrl = 'http://fake-core-presigned-url';

  const MessageIdReplacement = ModelFactory.getByName(messageIdReplacementModelName);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModelName);
  const MessageFragment = ModelFactory.getByName(messageFragmentModelName);
  // ================= END =================

  // ================= SETUP AND TEARDOWN =================
  beforeAll(async () => {
    logger.add(transportSpy);

    process.env.GP2GP_MESSENGER_SERVICE_URL = gp2gpUrl;
    process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS = gp2gpAuth;
    process.env.EHR_REPO_SERVICE_URL = ehrRepoUrl;
    process.env.EHR_REPO_AUTHORIZATION_KEYS = ehrRepoAuth;

    // clear all records in database before test start
    await RegistrationRequest.destroy({ where: {}, force: true });
    await MessageFragment.destroy({ where: {}, force: true });
    await MessageIdReplacement.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    delete process.env.GP2GP_MESSENGER_SERVICE_URL;
    delete process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS;
    delete process.env.EHR_REPO_SERVICE_URL;
    delete process.env.EHR_REPO_AUTHORIZATION_KEYS;

    // close the db connection to avoid "Jest did not exit" warning messages
    await ModelFactory.sequelize.close();
  });
  // ================= END SETUP AND TEARDOWN =================

  // ================= HELPER FUNCTIONS =================
  const extractMessageId = ebXML =>
    extractEbXmlData(ebXML).then(extractedData => extractedData.messageId);

  const setUpMockForGp2gpGetOdsCode = () =>
    nock(gp2gpUrl, gp2gpHeaders)
      .persist()
      .get(`/patient-demographics/${nhsNumber}`)
      .reply(200, { data: { odsCode } });

  const setUpMockForEhrRepoCoreMessage = () =>
    nock(ehrRepoUrl, ehrRepoHeaders).get(`/patients/${nhsNumber}`).reply(200, {
      coreMessageUrl: ehrCorePresignedUrl,
      fragmentMessageIds: fragmentMessageIds,
      conversationIdFromEhrIn: conversationIdFromEhrIn
    });
  // ================= END HELPER FUNCTIONS =================

  describe('EHR core uses new message IDs', () => {
    it('should update the message IDs of the EHR core and referenced fragments', async () => {
      // given
      const ehrCore = readFileSync('src/__tests__/data/ehr_with_fragments/ehr-core', 'utf8');

      const ebXML = JSON.parse(ehrCore).ebXML;
      const oldMessageId = await extractMessageId(ebXML);
      const oldReferencedFragmentIds = await extractReferencedFragmentMessageIds(ebXML);
      const uuidRegexPattern = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/

      // set up mocks
      const ehrRepoScope = setUpMockForEhrRepoCoreMessage();
      const s3Scope = nock(ehrCorePresignedUrl).get('/').reply(200, ehrCore);
      const gp2gpMessengerGetODSScope = setUpMockForGp2gpGetOdsCode();

      let gp2gpMessengerPostBody;
      const storePostBody = body => {
        gp2gpMessengerPostBody = body;
        return true;
      };

      const gp2gpMessengerSendCoreScope = nock(gp2gpUrl, gp2gpHeaders)
        .post('/ehr-out-transfers/core', body => storePostBody(body))
        .reply(204);

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      // then
      expect(ehrRepoScope.isDone()).toBe(true);
      expect(gp2gpMessengerGetODSScope.isDone()).toBe(true);
      expect(s3Scope.isDone()).toBe(true);
      expect(gp2gpMessengerSendCoreScope.isDone()).toBe(true);

      expect(gp2gpMessengerPostBody).toEqual({
        conversationId: conversationId,
        odsCode: odsCode,
        ehrRequestId: ehrRequestId,
        coreEhr: expect.anything(),
        messageId: expect.stringMatching(uuidRegexPattern)
      });

      const outBoundEhrCore = gp2gpMessengerPostBody.coreEhr;

      const outBoundEhrCoreAsString = JSON.stringify(outBoundEhrCore);

      expect(outBoundEhrCoreAsString.includes(oldMessageId)).toBe(false);
      for (let oldFragmentId of oldReferencedFragmentIds) {
        expect(outBoundEhrCoreAsString.includes(oldFragmentId)).toBe(false);
      }
    });
  });

  describe('Message fragments use new message IDs', () => {
    function makePresignedUrlForFragment(messageId) {
      return `http://fake-fragment-presign-url/${messageId}`;
    }

    function setUpMockForEhrRepoFragmentMessage(messageId) {
      const ehrFragmentPresignedUrl = makePresignedUrlForFragment(messageId);

      return (
        nock(ehrRepoUrl, ehrRepoHeaders)
          .get(`/fragments/${conversationIdFromEhrIn}/${messageId}`)
          .reply(200, ehrFragmentPresignedUrl)
      );
    }

    function readMessageFragmentFile(fragmentFilename) {
      return readFileSync(`src/__tests__/data/ehr_with_fragments/${fragmentFilename}`, 'utf8');
    }

    function setUpMockForS3BucketFragmentMessage(filename, messageId) {
      const fragmentFile = readMessageFragmentFile(filename);
      const ehrFragmentPresignedUrl = makePresignedUrlForFragment(messageId);
      const { hostname, pathname } = new URL(ehrFragmentPresignedUrl);

      return nock(`http://${hostname}`).get(pathname).reply(200, fragmentFile);
    }

    it('should update the message IDs of the message fragment and nested fragments within the fragment', async () => {
      // given
      const filenamesAndMessageIds = {
        'fragment-1': 'DFBA6AC0-DDC7-11ED-808B-AC162D1F16F0',
        'fragment-2': 'DFEC7740-DDC7-11ED-808B-AC162D1F16F0',
        'fragment-2-1': 'DFEC7741-DDC7-11ED-808B-AC162D1F16F0',
        'fragment-2-2': 'DFF61430-DDC7-11ED-808B-AC162D1F16F0'
      };
      const messageFragmentFilenames = Object.keys(filenamesAndMessageIds);
      const oldMessageFragmentIds = Object.values(filenamesAndMessageIds);

      // set up mocks
      const ehrRepoPatientRecordScope = setUpMockForEhrRepoCoreMessage();
      const ehrRepoFragmentScopes = oldMessageFragmentIds.map(setUpMockForEhrRepoFragmentMessage);
      const s3Scopes = Object.entries(filenamesAndMessageIds).map(([filename, messageId]) => {
        return setUpMockForS3BucketFragmentMessage(filename, messageId);
      });
      const gp2gpMessengerGetODSScope = setUpMockForGp2gpGetOdsCode();

      let gp2gpMessengerPostBodies = [];
      const storePostBody = body => {
        gp2gpMessengerPostBodies.push(body);
        return true;
      };

      const gp2gpMessengerSendFragmentScope = nock(gp2gpUrl, gp2gpHeaders)
        .persist()
        .post('/ehr-out-transfers/fragment', body => storePostBody(body))
        .reply(204);

      // when
      await transferOutFragments({ conversationId, nhsNumber, odsCode });

      // then
      // assert all endpoints are called
      s3Scopes.forEach(scope => {
        expect(scope.isDone()).toBe(true);
      });
      ehrRepoFragmentScopes.forEach(scope => {
        expect(scope.isDone()).toBe(true);
      });
      expect(gp2gpMessengerSendFragmentScope.isDone()).toBe(true);

      // compare the post bodies that gp2gp-messenger got

      for (let postBody of gp2gpMessengerPostBodies) {
        expect(postBody.conversationId).toEqual(conversationId);
        expect(postBody.odsCode).toEqual(odsCode);

        expect(postBody.messageId).toEqual(postBody.messageId.toUpperCase());
        expect(oldMessageFragmentIds).not.toContain(postBody.messageId);
      }

      const newMessageFragmentIds = await Promise.all(
        oldMessageFragmentIds.map(getNewMessageIdByOldMessageId)
      );
      const newMessageIdsInPostRequests = gp2gpMessengerPostBodies.map(body => body.messageId);
      expect(newMessageIdsInPostRequests).toEqual(newMessageFragmentIds);

      // manually replace all message ids in copied ver of original messages,
      // and compare those with the actual outbound fragment messages
      const outboundFragmentMessages = gp2gpMessengerPostBodies.map(body => body.fragmentMessage);

      let messageIdPairs = {};
      for (let oldMessageId of oldMessageFragmentIds) {
        const newMessageId = await getNewMessageIdByOldMessageId(oldMessageId);
        messageIdPairs[oldMessageId] = newMessageId;
      }
      const replaceAllMessageIds = messageFragmentAsString => {
        for (let [oldMessageId, newMessageId] of Object.entries(messageIdPairs)) {
          messageFragmentAsString = messageFragmentAsString.replaceAll(oldMessageId, newMessageId);
        }
        return messageFragmentAsString;
      };

      const expectedOutboundFragmentMessages = messageFragmentFilenames
        .map(readMessageFragmentFile)
        .map(replaceAllMessageIds)
        .map(str => JSON.parse(str));

      expect(outboundFragmentMessages).toEqual(expectedOutboundFragmentMessages);
    });
  });
});
