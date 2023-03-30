import { sendFragment } from "../send-fragment";
import { logInfo } from "../../../middleware/logging";
import { SendFragmentError } from "../../../errors/errors";
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

describe('sendFragment', () => {
  // ============ COMMON PROPERTIES ============
  const AUTH_KEYS = 'fake-keys';
  const REQUEST_BASE_URL = 'http://localhost';
  const REQUEST_ENDPOINT = '/ehr-out-transfers';
  const FULL_URL = REQUEST_BASE_URL + REQUEST_ENDPOINT;
  const CONVERSATION_ID = '22d24155-c08c-4cac-a84a-4a5db46a2f99';
  const ODS_CODE = 'G67200';
  const MESSAGE_ID = '5cefa7a2-fbca-494a-a114-6f58fae4be4a';
  const FRAGMENT_MESSAGE = { ebXML: "", payload: "", attachments: [] };
  const REQUEST_BODY = {
    conversationId: CONVERSATION_ID,
    odsCode: ODS_CODE,
    messageId: MESSAGE_ID,
    fragmentMessage: FRAGMENT_MESSAGE
  };
  const HEADERS = { reqheaders: { Authorization: AUTH_KEYS } };
  // =================== END ===================

  it('should log message if message fragment sent successfully', async () => {
    // when
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/fragment`)
      .reply(204);

    await sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID);

    // then
    expect(mockUrlRequest.isDone()).toBe(true);
    expect(logInfo).toBeCalledTimes(1);
    expect(logInfo).toHaveBeenCalledWith('Successfully sent message fragment');
  });

  it('should throw error if sending message fragment unsuccessful', async () => {
    // when
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/fragment`)
      .reply(404);

    // then
    await expect(() => sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID))
      .rejects
      .toThrowError(SendFragmentError);
  });
});