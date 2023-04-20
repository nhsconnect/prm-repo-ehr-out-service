import nock from "nock";
import {
  downloadFromUrl,
  patientAndPracticeOdsCodesMatch,
  updateConversationStatus,
  updateFragmentStatus, updateMessageIdForEhrCore, updateReferencedFragmentIds
} from "../transfer-out-util";
import { logError, logInfo } from "../../../middleware/logging";
import {errorMessages, MessageIdUpdateError, StatusUpdateError} from "../../../errors/errors";
import { getPdsOdsCode } from "../../gp2gp/pds-retrieval-request";
import { Status } from "../../../models/message-fragment";
import { updateRegistrationRequestStatus } from "../../database/registration-request-repository";
import { setCurrentSpanAttributes } from "../../../config/tracing";
import { updateMessageFragmentStatus } from "../../database/message-fragment-repository";
import expect from "expect";
import {readFileSync} from "fs";
import {extractEbXmlData, extractReferencedFragmentMessageIds} from "../../parser/extract-eb-xml-data";
import {validate as uuidValidate } from 'uuid';

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');
jest.mock('../../database/registration-request-repository');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../../config/tracing');


describe('testTransferOutUtil', () => {
  // ============ COMMON PROPERTIES ============
  const CONVERSATION_ID = '7fbeaba2-ca21-4af7-8f88-29d805b28411';
  const MESSAGE_ID = '2c1edc4d-052f-42b6-a03f-4470ff88ef05';
  function getValidEhrCore() {
    return readFileSync('src/__tests__/data/ehr_with_fragments/ehr-core', 'utf8');
  }
  // =================== END ===================

  describe('downloadFromUrl', () => {
    // ============ COMMON PROPERTIES ============
    const REQUEST_BASE_URL = 'https://example.com';
    const REQUEST_ENDPOINT = '/test';
    const FULL_URL = REQUEST_BASE_URL + REQUEST_ENDPOINT;
    // =================== END ===================

    it('should be 200 OK', async () => {
      // given
      const expectedResponse = {status: 200};

      // when
      const urlScope = nock(REQUEST_BASE_URL)
        .get(REQUEST_ENDPOINT)
        .reply(200, expectedResponse);

      const response = await downloadFromUrl(FULL_URL);

      // then
      expect(urlScope.isDone()).toEqual(true);
      expect(response).toEqual(expectedResponse);
    });

    it('should be 404 Not Found and throw DownloadError', async () => {
      // given
      let actualError;

      // when
      const urlScope = nock(REQUEST_BASE_URL)
        .get(REQUEST_ENDPOINT)
        .reply(404);

      try {await downloadFromUrl(FULL_URL);}
      catch (error) {actualError = error;}

      // then
      expect(urlScope.isDone()).toEqual(true);
      expect(actualError).not.toBeNull();
      expect(logError).toBeCalledWith(errorMessages.DOWNLOAD_ERROR, new Error('Request failed with status code 404'));
    });
  });

  describe('patientAndPracticeOdsCodesMatch', () => {
    // ============ COMMON PROPERTIES ============
    const NHS_NUMBER = 1234567890;
    const ODS_CODES = [
      'K81003002',
      'G9047420'
    ];
    // =================== END ===================

    it('should return true when practice and patient ODS codes match', async () => {
      // when
      getPdsOdsCode.mockReturnValueOnce(ODS_CODES[0]);
      const response = await patientAndPracticeOdsCodesMatch(NHS_NUMBER, ODS_CODES[0]);

      // then
      expect(response).toBe(true);
      expect(getPdsOdsCode).toBeCalledTimes(1);
    });

    it('should return false when practice and patient ODS codes do not match', async () => {
      // when
      getPdsOdsCode.mockReturnValueOnce(ODS_CODES[0]);
      const response = await patientAndPracticeOdsCodesMatch(NHS_NUMBER, ODS_CODES[1]);

      // then
      expect(response).toBe(false);
      expect(getPdsOdsCode).toBeCalledTimes(1);
    });
  });

  describe('updateConversationStatus', () => {
    // ============ COMMON PROPERTIES ============
    const STATUS = Status.FRAGMENT_REQUEST_RECEIVED;
    const LOG_MESSAGE = 'This is an example log message';
    // =================== END ===================

    it('should update the conversation status successfully', async () => {
      // when
      updateRegistrationRequestStatus.mockResolvedValueOnce(undefined);
      await updateConversationStatus(CONVERSATION_ID, STATUS);

      // then
      expect(setCurrentSpanAttributes).toBeCalledTimes(1);
      expect(setCurrentSpanAttributes).toBeCalledWith({ conversationId: CONVERSATION_ID });
      expect(updateRegistrationRequestStatus).toBeCalledTimes(1);
      expect(logInfo).toBeCalledTimes(1);
      expect(logInfo).toBeCalledWith(`Updating conversation with status: ${STATUS}`);
    });

    it('should log the provided message successfully', async () => {
      // when
      updateRegistrationRequestStatus.mockResolvedValueOnce(undefined);
      await updateConversationStatus(CONVERSATION_ID, STATUS, LOG_MESSAGE);

      // then
      expect(setCurrentSpanAttributes).toBeCalledTimes(1);
      expect(setCurrentSpanAttributes).toBeCalledWith({  conversationId: CONVERSATION_ID });
      expect(logInfo).toBeCalledTimes(2);
      expect(logInfo).toBeCalledWith(`Updating conversation with status: ${STATUS}`);
      expect(logInfo).toBeCalledWith(LOG_MESSAGE);
    });

    it('should throw a StatusUpdateError error', async () => {
      // when
      updateRegistrationRequestStatus.mockRejectedValueOnce(undefined);

      // then
      await expect(() => updateConversationStatus(CONVERSATION_ID, STATUS, LOG_MESSAGE))
        .rejects
        .toThrowError(StatusUpdateError);
    });
  });

  describe('updateFragmentStatus', () => {
    // ============ COMMON PROPERTIES ============
    const STATUS = Status.INCORRECT_ODS_CODE;
    const LOG_MESSAGE = 'This is an example log message';
    // =================== END ===================

    it('should update the fragment status successfully', async () => {
      // when
      updateMessageFragmentStatus.mockResolvedValueOnce(undefined);
      await updateFragmentStatus(CONVERSATION_ID, MESSAGE_ID, STATUS);

      // then
      expect(updateMessageFragmentStatus).toBeCalledTimes(1);
      expect(logInfo).toBeCalledTimes(1);
      expect(logInfo).toBeCalledWith(`Updating fragment with status: ${STATUS}`);
    });

    it('should log the provided log message successfully', async () => {
      // given
      updateMessageFragmentStatus.mockResolvedValueOnce(undefined);
      await updateFragmentStatus(CONVERSATION_ID, MESSAGE_ID, STATUS, LOG_MESSAGE);

      // then
      expect(setCurrentSpanAttributes).toBeCalledTimes(1);
      expect(setCurrentSpanAttributes).toBeCalledWith({  conversationId: CONVERSATION_ID, messageId: MESSAGE_ID });
      expect(logInfo).toBeCalledTimes(2);
      expect(logInfo).toBeCalledWith(`Updating fragment with status: ${STATUS}`);
      expect(logInfo).toBeCalledWith(LOG_MESSAGE);
    });

    it('should throw a StatusUpdateError error', async () => {
      // when
      updateMessageFragmentStatus.mockRejectedValueOnce(undefined);

      // then
      await expect(() => updateFragmentStatus(CONVERSATION_ID, MESSAGE_ID, STATUS))
        .rejects
        .toThrowError(StatusUpdateError);
    });
  });

  describe('updateMessageIdForEhrCore', () => {
    it('should update the message id of EHR core', async () => {
      // given
      const ehrCore = getValidEhrCore();

      // when
      const ehrCoreWithUpdatedMessageId = await updateMessageIdForEhrCore(ehrCore)

      // then
      const { messageId: oldMessageId } = await extractEbXmlData(JSON.parse(ehrCore).ebXML);
      const { messageId: newMessageId } = await extractEbXmlData(JSON.parse(ehrCoreWithUpdatedMessageId).ebXML);

      expect(newMessageId).not.toEqual(oldMessageId);
      expect(uuidValidate(newMessageId)).toBe(true);

    })

    it('should throw an error when given an invalid ehrCore', async () => {
      // given
      const ehrCore = `{"ebXML": "<xml>some-invalid-xml</xml>"}`;

      // when
      await expect(updateMessageIdForEhrCore(ehrCore))
        // then
        .rejects.toThrowError(MessageIdUpdateError)
    })
  })


  describe('updateReferencedFragmentIds', () => {
    it('should update all referenced fragment ids in an EHR core', async () => {
      // given
      const ehrCore = getValidEhrCore();

      // when
      const ehrCoreWithUpdatedFragmentIds = await updateReferencedFragmentIds(ehrCore)

      // then
      const oldFragmentIdList = await extractReferencedFragmentMessageIds(JSON.parse(ehrCore).ebXML);
      const newFragmentIdList = await extractReferencedFragmentMessageIds(JSON.parse(ehrCoreWithUpdatedFragmentIds).ebXML);

      for (let newFragmentId of newFragmentIdList) {
        expect(uuidValidate(newFragmentId)).toBe(true);

        expect(oldFragmentIdList).not.toContain(newFragmentId);

        const newFragmentIdIsUnique = newFragmentIdList.indexOf(newFragmentId) === newFragmentIdList.lastIndexOf(newFragmentId)
        expect(newFragmentIdIsUnique).toBe(true)
      }
    })

    it('should throw an error when given an invalid ehrCore', async () => {
      // given
      const ehrCore = `{"ebXML": "<xml>some-invalid-xml</xml>"}`;

      // when
      await expect(updateReferencedFragmentIds(ehrCore))
        // then
        .rejects.toThrowError(MessageIdUpdateError)
    })
  })
});