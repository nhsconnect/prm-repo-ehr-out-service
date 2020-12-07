import nock from 'nock';
import { logError, logEvent } from '../../../middleware/logging';
import { getPatientHealthRecordFromRepo } from '../get-health-record';

jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({
    ehrRepoAuthKeys: 'fake-keys',
    ehrRepoServiceUrl: 'http://localhost'
  })
}));

describe('getPatientHealthRecordFromRepo', () => {
  const mockEhrRepoServiceUrl = 'http://localhost';
  const mockEhrRepoAuthKeys = 'fake-keys';
  const headers = { reqheaders: { Authorization: `${mockEhrRepoAuthKeys}` } };
  const nhsNumber = '1234567890';
  const conversationId = '87ebc8f1-41a0-4501-a96e-e9ae76dde7e6';
  const mockResponseBody = {
    data: {
      id: nhsNumber,
      type: 'patients',
      attributes: {
        conversationId
      }
    }
  };

  it('should retrieve patient and return 200 with odsCode, pdsId and serialChangeNumber', async () => {
    const scope = nock(mockEhrRepoServiceUrl, headers)
      .get(`/patients/${nhsNumber}`)
      .reply(200, mockResponseBody);

    const res = await getPatientHealthRecordFromRepo(nhsNumber);
    expect(scope.isDone()).toBe(true);
    expect(logEvent).toHaveBeenCalledWith(
      'Successfully retrieved complete health record from EHR Repo',
      {
        nhsNumber,
        conversationId
      }
    );
    expect(res.status).toBe(200);
    expect(res.data).toEqual(mockResponseBody);
  });

  it('should log and throw error when pds retrieval returns 500', async () => {
    let error = null;
    const expectedError = new Error('Request failed with status code 500');
    nock(mockEhrRepoServiceUrl, headers).get(`/patients/${nhsNumber}`).reply(500);

    try {
      await getPatientHealthRecordFromRepo(nhsNumber);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(logError).toHaveBeenCalledWith(
      'Cannot find complete patient health record',
      expectedError
    );
  });
});
