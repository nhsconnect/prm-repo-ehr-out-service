import nock from 'nock';
import { sendEhrExtract } from '../send-ehr-extract';
import { logError, logEvent } from '../../../middleware/logging';

jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({
    gp2gpAdaptorAuthKeys: 'fake-keys',
    gp2gpAdaptorServiceUrl: 'http://localhost'
  })
}));

describe('sendEhrExtract', () => {
  const mockGp2gpAdaptorServiceUrl = 'http://localhost';
  const mockGp2gpAdaptorAuthKeys = 'fake-keys';
  const headers = { reqheaders: { Authorization: `${mockGp2gpAdaptorAuthKeys}` } };
  let conversationId = '41291044-8259-4D83-AE2B-93B7BFCABE73';
  let odsCode = 'B1234';
  let ehrRequestId = '26A541CE-A5AB-4713-99A4-150EC3DA25C6';
  let currentEhrUrl = 'fake-url';
  const requestBody = {
    data: {
      type: 'health-record-transfers',
      id: conversationId,
      attributes: {
        odsCode,
        ehrRequestId
      },
      links: {
        currentEhrUrl
      }
    }
  };

  it('should call sendEhr and return 204', async () => {
    const scope = nock(mockGp2gpAdaptorServiceUrl, headers)
      .post(`/health-record-transfers`, requestBody)
      .reply(204);

    await sendEhrExtract(conversationId, odsCode, ehrRequestId, currentEhrUrl);
    expect(scope.isDone()).toBe(true);
    expect(logEvent).toHaveBeenCalledWith('Successfully sent ehr', { conversationId })
  });

  it('should log and throw error when returns 500', async () => {
    let error = null;
    const expectedError = new Error('Request failed with status code 500');
    nock(mockGp2gpAdaptorServiceUrl, headers).post(`/health-record-transfers`, requestBody).reply(500);

    try {
      await sendEhrExtract(conversationId, odsCode, ehrRequestId, currentEhrUrl);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(logError).toHaveBeenCalledWith('Failed while trying to send ehr', expectedError);
  });
})