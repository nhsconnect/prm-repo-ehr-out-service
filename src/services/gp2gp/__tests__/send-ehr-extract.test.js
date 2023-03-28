// TODO [PRMT-2728] DEPRECATED

import nock from 'nock';
import { sendEhrExtract } from '../send-ehr-extract';
import { logError, logInfo } from '../../../middleware/logging';
import { config } from "../../../config/index";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../../config');

// Set Up
beforeEach(() => {
  config.mockReturnValue({
    gp2gpMessengerAuthKeys: 'fake-keys',
    gp2gpMessengerServiceUrl: 'http://localhost'
  });
});

describe('sendEhrExtract', () => {
  const mockgp2gpMessengerServiceUrl = 'http://localhost';
  const mockgp2gpMessengerAuthKeys = 'fake-keys';
  const headers = { reqheaders: { Authorization: `${mockgp2gpMessengerAuthKeys}` } };
  let conversationId = '41291044-8259-4d83-ae2b-93b7bfcabe73';
  let odsCode = 'B1234';
  let ehrRequestId = '26a541ce-a5ab-4713-99a4-150ec3da25c6';
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
    const scope = nock(mockgp2gpMessengerServiceUrl, headers)
      .post(`/health-record-transfers`, requestBody)
      .reply(204);

    await sendEhrExtract(conversationId, odsCode, ehrRequestId, currentEhrUrl);
    expect(scope.isDone()).toBe(true);
    expect(logInfo).toHaveBeenCalledWith(
      `Successfully sent ehr with conversationId: ${conversationId}`
    );
  });

  it('should log and throw error when returns 500', async () => {
    let error = null;
    const expectedError = new Error('Request failed with status code 500');
    nock(mockgp2gpMessengerServiceUrl, headers)
      .post(`/health-record-transfers`, requestBody)
      .reply(500);

    try {
      await sendEhrExtract(conversationId, odsCode, ehrRequestId, currentEhrUrl);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(logError).toHaveBeenCalledWith('Failed while trying to send ehr', expectedError);
  });
});
