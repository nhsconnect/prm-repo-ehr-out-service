import { sendCore } from "../send-core";
import { logInfo } from "../../../middleware/logging";
import { SendCoreError } from "../../../errors/errors";
import { config } from "../../../config/index";
import nock from "nock";
import expect from "expect";

// Mocking
jest.mock('../../../config');
jest.mock('../../../middleware/logging');

// Set Up
beforeEach(() => {
  config.mockReturnValue({
    gp2gpMessengerAuthKeys: 'fake-keys',
    gp2gpMessengerServiceUrl: 'http://localhost'
  });
});

describe('sendCore', () => {
  // ============ COMMON PROPERTIES ============
  const AUTH_KEYS = 'fake-keys';
  const REQUEST_BASE_URL = 'http://localhost';
  const REQUEST_ENDPOINT = '/ehr-out-transfers';
  const FULL_URL = REQUEST_BASE_URL + REQUEST_ENDPOINT;
  const CONVERSATION_ID = '22d24155-c08c-4cac-a84a-4a5db46a2f99';
  const ODS_CODE = 'G67200';
  const CORE_EHR = { ebXML: "", payload: "", attachments: [] };
  const EHR_REQUEST_ID = '5cefa7a2-fbca-494a-a114-6f58fae4be4a';
  const REQUEST_BODY = {
    conversationId: CONVERSATION_ID,
    odsCode: ODS_CODE,
    coreEhr: CORE_EHR,
    ehrRequestId: EHR_REQUEST_ID
  };
  const HEADERS = { reqheaders: { Authorization: AUTH_KEYS } };
  // =================== END ===================

  it('should log message if ehr core sent successfully', async () => {
    // when
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/core`)
      .reply(204);

    await sendCore(CONVERSATION_ID, ODS_CODE, CORE_EHR, EHR_REQUEST_ID);

    // then
    expect(mockUrlRequest.isDone()).toBe(true);
    expect(logInfo).toBeCalledTimes(1);
    expect(logInfo).toHaveBeenCalledWith('Successfully sent ehr core');
  });

  it('should throw error if sending ehr core unsuccessful', async () => {
    // when
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/fragment`)
      .reply(404);

    // then
    await expect(() => sendCore(CONVERSATION_ID, ODS_CODE, CORE_EHR, EHR_REQUEST_ID))
      .rejects
      .toThrowError(SendCoreError);
  });
});