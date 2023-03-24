import nock from 'nock';
import { logError } from '../../../middleware/logging';
import { getPatientHealthRecordFromRepo } from '../get-health-record';
import { config } from '../../../config';

jest.mock('../../../middleware/logging');
jest.mock('../../../config');

describe('getPatientHealthRecordFromRepo', () => {
  describe('new ehr repo api', () => {
    beforeEach(() => {
      config.mockReturnValue({
        ehrRepoAuthKeys: 'fake-keys',
        ehrRepoServiceUrl: 'http://localhost'
      });
    });
    const mockEhrRepoServiceUrl = 'http://localhost';
    const mockEhrRepoAuthKeys = 'fake-keys';
    const conversationId = 'fake-conversationId';
    const conversationIdFromEhrIn = 'fake-conversationIdFromEhrIn';
    const fragmentMessageIds = [];
    const headers = {
      reqheaders: { Authorization: `${mockEhrRepoAuthKeys}`, conversationId: `${conversationId}` }
    };
    const nhsNumber = '1234567890';
    const coreMessageUrl = 'fake-url';
    const ehrIsPresentEhrRepoResponse = {
      coreMessageUrl,
      fragmentMessageIds,
      conversationIdFromEhrIn: conversationIdFromEhrIn
    };

    it('should return the url of the stored core ehr message when the patients health record is in repo', async () => {
      const scope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, ehrIsPresentEhrRepoResponse);

      const res = await getPatientHealthRecordFromRepo(nhsNumber, conversationId);
      expect(scope.isDone()).toBe(true);
      expect(res).toEqual({ coreMessageUrl: coreMessageUrl });
    });



    it('should return null when gets a 404 and patients health record was not found in repo', async () => {
      const expectedError = new Error('Request failed with status code 404');
      const scope = nock(mockEhrRepoServiceUrl, headers).get(`/patients/${nhsNumber}`).reply(404);

      const res = await getPatientHealthRecordFromRepo(nhsNumber, conversationId);
      expect(scope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith(
        'Cannot find complete patient health record',
        expectedError
      );
      expect(res).toBe(null);
    });

    it('should log and throw error when cannot retrieve health record from repo', async () => {
      const expectedError = new Error('Request failed with status code 500');
      const scope = nock(mockEhrRepoServiceUrl, headers).get(`/patients/${nhsNumber}`).reply(500);

      let actualError = null;
      try {
        await getPatientHealthRecordFromRepo(nhsNumber, conversationId);
      } catch (err) {
        actualError = err;
      }

      expect(scope.isDone()).toBe(true);
      expect(actualError).not.toBeNull();
      expect(logError).toHaveBeenCalledWith('Error retrieving health record', expectedError);
    });
  });
});
