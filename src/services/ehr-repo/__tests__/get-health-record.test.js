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

  it('should return true when the patients health record is in repo', async () => {
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
    expect(res).toBe(true);
  });

  it('should return false when gets a 404 and patients health record was not found in repo', async () => {
    const expectedError = new Error('Request failed with status code 404');
    const scope = nock(mockEhrRepoServiceUrl, headers).get(`/patients/${nhsNumber}`).reply(404);

    const res = await getPatientHealthRecordFromRepo(nhsNumber);
    expect(scope.isDone()).toBe(true);
    expect(logError).toHaveBeenCalledWith(
      'Cannot find complete patient health record',
      expectedError
    );
    expect(res).toBe(false);
  });

  it('should log and throw error when pds retrieval returns 500', async () => {
    const expectedError = new Error('Request failed with status code 500');
    const scope = nock(mockEhrRepoServiceUrl, headers).get(`/patients/${nhsNumber}`).reply(500);
    const res = await getPatientHealthRecordFromRepo(nhsNumber);

    expect(scope.isDone()).toBe(true);
    expect(res).toBe(false);
    expect(logError).toHaveBeenCalledWith(
      'Cannot find complete patient health record',
      expectedError
    );
  });
});
