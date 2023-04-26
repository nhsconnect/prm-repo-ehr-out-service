import { readFileSync } from 'fs';
import expect from 'expect';
import nock from 'nock';
import { validate as uuidValidate, v4 as uuidv4 } from 'uuid';

import { setCurrentSpanAttributes } from '../../../config/tracing';
import {
  errorMessages,
  FragmentMessageIdReplacementRecordNotFoundError,
  MessageIdUpdateError,
  StatusUpdateError
} from '../../../errors/errors';
import { logError, logInfo } from '../../../middleware/logging';
import { Status } from '../../../models/message-fragment';
import { createMessageIdReplacement } from '../../database/create-message-id-replacement';
import { updateMessageFragmentStatus } from '../../database/message-fragment-repository';
import { getNewMessageIdByOldMessageId } from '../../database/message-id-replacement-repository';
import { updateRegistrationRequestStatus } from '../../database/registration-request-repository';
import { getPdsOdsCode } from '../../gp2gp/pds-retrieval-request';
import {
  extractEbXmlData,
  extractReferencedFragmentMessageIds
} from '../../parser/extract-eb-xml-data';
import {
  createNewMessageIdsForAllFragments,
  downloadFromUrl,
  patientAndPracticeOdsCodesMatch,
  updateAllFragmentsMessageIds,
  updateConversationStatus,
  updateFragmentStatus,
  updateMessageIdForEhrCore,
  updateMessageIdForMessageFragment,
  updateReferencedFragmentIds
} from '../transfer-out-util';

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');
jest.mock('../../database/create-message-id-replacement');
jest.mock('../../database/registration-request-repository');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../database/message-id-replacement-repository');
jest.mock('../../../config/tracing');

describe('testTransferOutUtil', () => {
  // ============ COMMON PROPERTIES ============
  const CONVERSATION_ID = '7fbeaba2-ca21-4af7-8f88-29d805b28411';
  const MESSAGE_ID = '2c1edc4d-052f-42b6-a03f-4470ff88ef05';
  const UPDATED_MESSAGE_ID = 'ccbbe10d-46bd-4f29-bc5f-53ebdca22ec2';
  const UUID_UPPERCASE_REGEX =
    /^[0-9A-F]{8}\b-[0-9A-F]{4}\b-[0-9A-F]{4}\b-[0-9A-F]{4}\b-[0-9A-F]{12}$/;

  function getValidEhrCore() {
    return readFileSync('src/__tests__/data/ehr_with_fragments/ehr-core', 'utf8');
  }

  function getValidMessageFragment() {
    return readFileSync('src/__tests__/data/ehr_with_fragments/fragment-1', 'utf8');
  }

  function getArrayOfValidMessageFragments() {
    const filenames = ['fragment-1', 'fragment-2', 'fragment-2-1', 'fragment-2-2'];

    return filenames.map(filename =>
      readFileSync(`src/__tests__/data/ehr_with_fragments/${filename}`, 'utf8')
    );
  }

  function getValidNestedMessageFragment() {
    return readFileSync('src/__tests__/data/ehr_with_fragments/fragment-2', 'utf8');
  }

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =================== END ===================

  describe('downloadFromUrl', () => {
    // ============ COMMON PROPERTIES ============
    const REQUEST_BASE_URL = 'https://example.com';
    const REQUEST_ENDPOINT = '/test';
    const FULL_URL = REQUEST_BASE_URL + REQUEST_ENDPOINT;
    // =================== END ===================

    it('should be 200 OK', async () => {
      // given
      const expectedResponse = { status: 200 };

      // when
      const urlScope = nock(REQUEST_BASE_URL).get(REQUEST_ENDPOINT).reply(200, expectedResponse);

      const response = await downloadFromUrl(FULL_URL);

      // then
      expect(urlScope.isDone()).toEqual(true);
      expect(response).toEqual(expectedResponse);
    });

    it('should be 404 Not Found and throw DownloadError', async () => {
      // given
      let actualError;

      // when
      const urlScope = nock(REQUEST_BASE_URL).get(REQUEST_ENDPOINT).reply(404);

      try {
        await downloadFromUrl(FULL_URL);
      } catch (error) {
        actualError = error;
      }

      // then
      expect(urlScope.isDone()).toEqual(true);
      expect(actualError).not.toBeNull();
      expect(logError).toBeCalledWith(
        errorMessages.DOWNLOAD_ERROR,
        new Error('Request failed with status code 404')
      );
    });
  });

  describe('patientAndPracticeOdsCodesMatch', () => {
    // ============ COMMON PROPERTIES ============
    const NHS_NUMBER = 1234567890;
    const ODS_CODES = ['K81003002', 'G9047420'];
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
      expect(setCurrentSpanAttributes).toBeCalledWith({ conversationId: CONVERSATION_ID });
      expect(logInfo).toBeCalledTimes(2);
      expect(logInfo).toBeCalledWith(`Updating conversation with status: ${STATUS}`);
      expect(logInfo).toBeCalledWith(LOG_MESSAGE);
    });

    it('should throw a StatusUpdateError error', async () => {
      // when
      updateRegistrationRequestStatus.mockRejectedValueOnce(undefined);

      // then
      await expect(() =>
        updateConversationStatus(CONVERSATION_ID, STATUS, LOG_MESSAGE)
      ).rejects.toThrowError(StatusUpdateError);
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
      expect(setCurrentSpanAttributes).toBeCalledWith({
        conversationId: CONVERSATION_ID,
        messageId: MESSAGE_ID
      });
      expect(logInfo).toBeCalledTimes(2);
      expect(logInfo).toBeCalledWith(`Updating fragment with status: ${STATUS}`);
      expect(logInfo).toBeCalledWith(LOG_MESSAGE);
    });

    it('should throw a StatusUpdateError error', async () => {
      // when
      updateMessageFragmentStatus.mockRejectedValueOnce(undefined);

      // then
      await expect(() =>
        updateFragmentStatus(CONVERSATION_ID, MESSAGE_ID, STATUS)
      ).rejects.toThrowError(StatusUpdateError);
    });
  });

  describe('updateMessageIdForEhrCore', () => {
    it('should update the message id of EHR core with upper case uuid', async () => {
      // given
      const ehrCore = JSON.parse(getValidEhrCore());

      // when
      const ehrCoreWithUpdatedMessageId = await updateMessageIdForEhrCore(ehrCore);

      // then
      const { messageId: oldMessageId } = await extractEbXmlData(ehrCore.ebXML);
      const { messageId: newMessageId } = await extractEbXmlData(ehrCoreWithUpdatedMessageId.ebXML);

      expect(newMessageId).not.toEqual(oldMessageId);
      expect(uuidValidate(newMessageId)).toBe(true);
      expect(newMessageId).toEqual(newMessageId.toUpperCase());
    });

    it('should throw an error when given an invalid ehrCore', async () => {
      // given
      const ehrCore = { ebXML: '<xml>some-invalid-xml</xml>' };

      // when
      await expect(updateMessageIdForEhrCore(ehrCore))
        // then
        .rejects.toThrowError(MessageIdUpdateError);
    });
  });

  describe('createNewMessageIdsForAllFragments', () => {
    it('should create new fragment message ids and store them in database', async () => {
      // given
      const oldFragmentMessageIds = [uuidv4(), uuidv4(), uuidv4()];

      // when
      await createNewMessageIdsForAllFragments(oldFragmentMessageIds);

      // then
      for (let oldFragmentId of oldFragmentMessageIds) {
        expect(createMessageIdReplacement).toHaveBeenCalledWith(
          oldFragmentId,
          expect.stringMatching(UUID_UPPERCASE_REGEX)
        );
      }
    });

    it('should throw an error when failed to store the old and new message id pairs in database', async () => {
      // given
      const oldFragmentMessageIds = [uuidv4(), uuidv4(), uuidv4()];
      const expectedError = new Error('some database error');
      createMessageIdReplacement.mockRejectedValueOnce(expectedError);

      // when
      await expect(createMessageIdReplacement(oldFragmentMessageIds))
        // then
        .rejects.toThrowError(expectedError);
    });
  });

  describe('updateReferencedFragmentIds', () => {
    const testItems = [
      { ehrMessage: JSON.parse(getValidEhrCore()), messageType: 'ehrCore' },
      { ehrMessage: JSON.parse(getValidNestedMessageFragment()), messageType: 'ehrNestedFragment' }
    ];

    it.each(testItems)(
      'should update all referenced fragment ids in an $messageType',
      async ({ ehrMessage }) => {
        getNewMessageIdByOldMessageId.mockResolvedValueOnce('new-fragment-id-1');
        getNewMessageIdByOldMessageId.mockResolvedValueOnce('new-fragment-id-2');

        // when
        const ehrMessageWithUpdatedFragmentIds = await updateReferencedFragmentIds(ehrMessage);

        // then
        const oldFragmentIdList = await extractReferencedFragmentMessageIds(ehrMessage.ebXML);
        const newFragmentIdList = await extractReferencedFragmentMessageIds(
          ehrMessageWithUpdatedFragmentIds.ebXML
        );

        expect(newFragmentIdList).toEqual(['new-fragment-id-1', 'new-fragment-id-2']);
        for (let oldFragmentId of oldFragmentIdList) {
          expect(ehrMessageWithUpdatedFragmentIds).not.toContain(oldFragmentId);
        }
      }
    );

    it('should return a fragment unchanged if no other fragment was referenced in it', async () => {
      // given
      const ehrFragment = JSON.parse(getValidMessageFragment());

      // when
      const returnedEhrFragment = await updateReferencedFragmentIds(ehrFragment);

      // then
      expect(returnedEhrFragment).toEqual(ehrFragment);
      expect(getNewMessageIdByOldMessageId).not.toHaveBeenCalled();
    });

    it('should throw an error when given an invalid ehrCore', async () => {
      // given
      const ehrCore = `{"ebXML": "<xml>some-invalid-xml</xml>"}`;

      // when
      await expect(updateReferencedFragmentIds(ehrCore))
        // then
        .rejects.toThrowError(MessageIdUpdateError);
    });

    it('should throw an error when failed to retrieve the new message id pairs in database', async () => {
      // given
      const ehrCore = getValidEhrCore();
      getNewMessageIdByOldMessageId.mockRejectedValueOnce(new Error('some error'));

      // when
      await expect(updateReferencedFragmentIds(ehrCore))
        // then
        .rejects.toThrowError(MessageIdUpdateError);
    });
  });

  describe('updateAllFragmentsMessageIds', () => {
    it('should update all the message ids of given fragments', async () => {
      // given
      const fragments = getArrayOfValidMessageFragments().map(file => JSON.parse(file));
      const extractMessageId = fragment => {
        return extractEbXmlData(fragment.ebXML).then(extractedData => extractedData.messageId);
      };
      const oldMessageIds = await Promise.all(fragments.map(extractMessageId));
      const newMessageIdsForMocking = oldMessageIds.map(() => uuidv4().toUpperCase());

      // when
      getNewMessageIdByOldMessageId.mockImplementation(key => {
        return newMessageIdsForMocking[oldMessageIds.indexOf(key)];
      });
      const fragmentsWithUpdatedMessageIds = await updateAllFragmentsMessageIds(fragments);

      // then
      for (let [newMessageId, updatedFragment] of Object.entries(fragmentsWithUpdatedMessageIds)) {
        expect(newMessageIdsForMocking).toContain(newMessageId);
        expect(oldMessageIds).not.toContain(newMessageId);

        const actualMessageIdInUpdatedFragment = await extractMessageId(updatedFragment);
        expect(actualMessageIdInUpdatedFragment).toEqual(newMessageId);
      }
    });
  });

  describe('updateMessageIdForMessageFragment', () => {
    it('should update the message id of message fragment to the new id created during ehr core transfer', async () => {
      // given
      const fragment = JSON.parse(getValidMessageFragment());

      // when
      getNewMessageIdByOldMessageId.mockReturnValueOnce(UPDATED_MESSAGE_ID);
      const { updatedFragment, newMessageId } = await updateMessageIdForMessageFragment(fragment);

      // then
      const { messageId: oldMessageId } = await extractEbXmlData(fragment.ebXML);
      const { messageId: messageIdInUpdatedFragment } = await extractEbXmlData(
        updatedFragment.ebXML
      );

      expect(newMessageId).not.toEqual(oldMessageId);
      expect(newMessageId).toEqual(UPDATED_MESSAGE_ID);
      expect(messageIdInUpdatedFragment).toEqual(UPDATED_MESSAGE_ID);

      expect(uuidValidate(newMessageId)).toBe(true);
      expect(updatedFragment).not.toContain(oldMessageId);
    });
  });

  it('should throw an error when not able to find the new message id for a fragment', async () => {
    // given
    const fragment = JSON.parse(getValidMessageFragment());

    // when
    getNewMessageIdByOldMessageId.mockImplementation(() => {
      throw new FragmentMessageIdReplacementRecordNotFoundError();
    });

    await expect(updateMessageIdForMessageFragment(fragment))
      // then
      .rejects.toThrowError(FragmentMessageIdReplacementRecordNotFoundError);
  });
});
