import { getMessageFragmentRecordByMessageId } from '../../database/message-fragment-repository';
import { FragmentSendingError } from '../../../errors/errors';
import { Status } from '../../../models/message-fragment';
import { logInfo, logWarning } from '../../../middleware/logging';
import { sendFragment } from '../send-fragment';
import expect from 'expect';
import nock from 'nock';
import { createFragmentDbRecord } from '../../database/create-fragment-db-record';
import { updateFragmentStatus } from '../../transfer/transfer-out-util';
import {setupMockConfigForTest} from "./test-utils";

// Mocking
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../database/create-fragment-db-record');
jest.mock('../../transfer/transfer-out-util');

describe('sendFragment', () => {
  // ============ COMMON PROPERTIES ============
  const AUTH_KEYS = 'fake-keys';
  const REQUEST_BASE_URL = 'http://localhost';
  const REQUEST_ENDPOINT = '/ehr-out-transfers';
  const CONVERSATION_ID = '22d24155-c08c-4cac-a84a-4a5db46a2f99';
  const ODS_CODE = 'G67200';
  const MESSAGE_ID = '5cefa7a2-fbca-494a-a114-6f58fae4be4a';
  const FRAGMENT_MESSAGE = { ebXML: '', payload: '', attachments: [] };
  const HEADERS = { reqheaders: { Authorization: AUTH_KEYS } };
  // =================== END ===================

  beforeAll(() => {
    setupMockConfigForTest();
  });

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

    getMessageFragmentRecordByMessageId.mockResolvedValueOnce(null);
    createFragmentDbRecord.mockResolvedValueOnce(undefined);
    updateFragmentStatus.mockResolvedValueOnce(undefined);

    await expect(() =>
      sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID)
    ).rejects.toThrow(FragmentSendingError);

    expect(updateFragmentStatus).toBeCalledTimes(1);
    expect(updateFragmentStatus).toHaveBeenCalledWith(CONVERSATION_ID, MESSAGE_ID, Status.SENDING_FAILED);
    expect(mockUrlRequest.isDone()).toBe(true);
  });

  it('should validate duplicate transfer out requests', async () => {
    // when
    getMessageFragmentRecordByMessageId.mockReturnValueOnce({
      messageId: MESSAGE_ID,
      status: Status.SENT_FRAGMENT
    });

    await sendFragment(CONVERSATION_ID, ODS_CODE, FRAGMENT_MESSAGE, MESSAGE_ID);

    // then
    expect(logWarning).toHaveBeenCalledWith(
      `EHR message FRAGMENT with message ID ${MESSAGE_ID} has already been sent`
    );
    expect(createFragmentDbRecord).not.toHaveBeenCalled();
    expect(updateFragmentStatus).not.toHaveBeenCalled();
  });
});
