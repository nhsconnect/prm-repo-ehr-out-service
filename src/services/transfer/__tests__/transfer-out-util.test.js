import nock from "nock";
import { downloadFromUrl, patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../transfer-out-util";
import { logError } from "../../../middleware/logging";
import { errorMessages } from "../../../errors/errors";
import { getPdsOdsCode } from "../../gp2gp/pds-retrieval-request";
import { Status } from "../../../models/fragments-trace";
import { updateRegistrationRequestStatus } from "../../database/registration-request-repository";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');

describe('testTransferOutUtil', () => {

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

  // // TODO: Add tests for at least 1 passing and failing case.
  // describe('updateConversationStatus', () => {
  //   // ============ COMMON PROPERTIES ============
  //   const CONVERSATION_ID = '171e1469-38ea-4532-b18d-34332f2083c2';
  //   const STATUS = Status.FRAGMENT_REQUEST_RECEIVED;
  //   // =================== END ===================
  //
  //
  //   it('should update the conversation status successfully', async () => {
  //
  //     // when
  //     updateRegistrationRequestStatus.mockReturnValueOnce();
  //     const response = await updateConversationStatus(CONVERSATION_ID, STATUS);
  //
  //     // then
  //     expect(response.isDone()).toEqual(true);
  //   });
  //
  //   it('should fail to update the conversation and throw an error', async () => {
  //     // given
  //     // when
  //     // then
  //   });
  // });
  //
  // // TODO: Add tests for at least 1 pasing and failing case.
  // describe('updateFragmentStatus', () => {});
});