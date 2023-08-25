import { getMessageFragmentRecordByMessageId } from "../../database/message-fragment-repository";
import { FragmentSendingError } from "../../../errors/errors";
import { Status } from "../../../models/message-fragment";
import { logInfo } from "../../../middleware/logging";
import { sendFragment } from "../send-fragment";
import { config } from "../../../config/index";
import expect from "expect";
import nock from "nock";
import {createFragmentDbRecord} from "../../database/create-fragment-db-record";
import {updateFragmentStatus} from "../../transfer/transfer-out-util";

// Mocking
// jest.mock('../../../config');
jest.mock('../../../middleware/logging');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../database/create-fragment-db-record');
jest.mock("../../transfer/transfer-out-util");

// Set Up
// beforeEach(() => {
//   config.mockReturnValue({
//     gp2gpMessengerAuthKeys: 'fake-keys',
//     gp2gpMessengerServiceUrl: 'http://localhost'
//   });
// });

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

  it('should send fragment successfully', async () => {
    // when
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/fragment`)
      .reply(204);

    getMessageFragmentRecordByMessageId.mockResolvedValueOnce(null); // no previous DB record for this fragment
    createFragmentDbRecord.mockResolvedValueOnce(undefined); // assume database record creation works fine
    updateFragmentStatus.mockResolvedValueOnce(undefined);

    await sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID);

    // then
    expect(getMessageFragmentRecordByMessageId).toBeCalledTimes(1);
    expect(createFragmentDbRecord).toBeCalledTimes(1);
    expect(updateFragmentStatus).toBeCalledTimes(1);
    expect(mockUrlRequest.isDone()).toBe(true);
    expect(logInfo).toHaveBeenCalledWith('Successfully sent message fragment');
  });

  it('should throw error if sending message fragment unsuccessful', async () => {
    // when
    const mockUrlRequest = nock(REQUEST_BASE_URL, HEADERS)
      .post(`${REQUEST_ENDPOINT}/fragment`)
      .reply(404);

    updateFragmentStatus.mockResolvedValueOnce(undefined);

    // doesn't seem to work either
    // expect(sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID)).toThrow(FragmentSendingError)

    await expect(() => sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID))
      .rejects
      .toThrow(FragmentSendingError);

    expect(updateFragmentStatus).toBeCalledTimes(1);
    // expect(updateFragmentStatus.calls[0][0]).toHaveBeenCalledWith(CONVERSATION_ID);
    // expect(updateFragmentStatus.calls[0][1]).toHaveBeenCalledWith(MESSAGE_ID);
    // expect(updateFragmentStatus.calls[0][2]).toHaveBeenCalledWith(Status.FRAGMENT_SENDING_FAILED);
  });
});