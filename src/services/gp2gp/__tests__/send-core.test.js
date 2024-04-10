import { SendCoreError } from "../../../errors/errors";
import { setupMockConfigForTest } from "./test-utils";
import { sendCore } from "../send-core";
import expect from "expect";
import nock from "nock";
import {updateConversationStatus} from "../../transfer/transfer-out-util";
import {ConversationStatus} from "../../../constants/enums";

// Mocking
jest.mock('../../../config');
jest.mock('../../transfer/transfer-out-util');

describe('sendCore', () => {
  // ============ COMMON PROPERTIES ============
  const AUTH_KEYS = 'fake-keys';
  const REQUEST_BASE_URL = 'http://localhost';
  const REQUEST_ENDPOINT = '/ehr-out-transfers';
  const CONVERSATION_ID = '22d24155-c08c-4cac-a84a-4a5db46a2f99';
  const ODS_CODE = 'G67200';
  const CORE_EHR = { ebXML: "", payload: "", attachments: [] };
  const EHR_REQUEST_ID = '5cefa7a2-fbca-494a-a114-6f58fae4be4a';
  const MESSAGE_ID = '242d2dfa-9972-4798-8397-86a046f98e1d';
  const REQUEST_BODY = {
    conversationId: CONVERSATION_ID,
    odsCode: ODS_CODE,
    coreEhr: CORE_EHR,
    ehrRequestId: EHR_REQUEST_ID,
    messageId: MESSAGE_ID
  };
  const HEADERS = { reqheaders: { Authorization: AUTH_KEYS } };
  // =================== END ===================

  beforeAll(() => {
    setupMockConfigForTest();
  });

  it('should call updateConversationStatus if ehr core sent successfully', async () => {
    // when
    const log = `The EHR Core with Outbound Conversation ID ${CONVERSATION_ID} has successfully been sent.`;
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/core`, REQUEST_BODY)
      .reply(204);

    await sendCore(CONVERSATION_ID, ODS_CODE, CORE_EHR, EHR_REQUEST_ID, MESSAGE_ID);

    // then
    expect(mockUrlRequest.isDone()).toBe(true);
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, ConversationStatus.OUTBOUND_SENT_CORE, null, log);
  });

  it('should throw error if sending ehr core unsuccessful', async () => {
    // when
    nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/core`)
      .reply(404);

    // then
    await expect(() => sendCore(CONVERSATION_ID, ODS_CODE, CORE_EHR, EHR_REQUEST_ID, MESSAGE_ID))
      .rejects
      .toThrowError(SendCoreError);
  });
});