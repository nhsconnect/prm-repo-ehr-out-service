import nock from 'nock';
import { logError, logInfo } from '../../../middleware/logging';
import { getPatientHealthRecordFromRepo } from '../get-health-record';
import { initializeConfig } from '../../../config';
import { getEhrCoreFromRepo } from "../get-ehr";

jest.mock('../../../middleware/logging');
jest.mock('../../../config');

describe('getPatientHealthRecordFromRepo', () => {
  describe('new ehr repo api', () => {
    beforeEach(() => {
      initializeConfig.mockReturnValue({
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
    const description = 'EHR core from repo';
    const coreMessageUrl = 'http://fake-url';
    const ehrIsPresentEhrRepoUrlResponse = {
      coreMessageUrl,
      fragmentMessageIds,
      conversationIdFromEhrIn: conversationIdFromEhrIn
    };
    const ehrCore = {
      payload: "payload XML",
      attachments: ["attachment 1", "attachment 2"],
      external_attachments: ["ext attachment 1", "ext attachment 2"]
    }

    it('should return the stored ehr core message when the patients health record is in repo', async () => {
      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, ehrIsPresentEhrRepoUrlResponse);

      const ehrScope = nock(coreMessageUrl)
        .get("/")
        .reply(200, ehrCore);

      const res = await getEhrCoreFromRepo(nhsNumber, conversationId, description);

      expect(urlScope.isDone()).toBe(true);
      expect(ehrScope.isDone()).toBe(true);
      expect(res).toEqual(ehrCore);
    });

    // it('should return null when gets a 404 and patients health record was not found in repo', async () => {
    //   const expectedError = new Error('Cannot retrieve EHR out');
    //   const urlScope = nock(mockEhrRepoServiceUrl, headers)
    //     .get(`/patients/${nhsNumber}`)
    //     .reply(404, expectedError);
    //
    //   const res = await getEhrCoreFromRepo(nhsNumber, conversationId, description);
    //
    //   expect(urlScope.isDone()).toBe(true);
    //   expect(getEhrCoreFromRepo).toThrow(expectedError)
    //   expect(logError).toHaveBeenCalledWith(
    //     'Cannot find complete patient health record',
    //     expectedError
    //   );
    // });

    // it('should log and throw error when cannot retrieve health record from repo', async () => {
    //   const expectedError = new Error('Request failed with status code 500');
    //   const scope = nock(mockEhrRepoServiceUrl, headers).get(`/patients/${nhsNumber}`).reply(500);
    //
    //   let actualError = null;
    //   try {
    //     await getEhrCoreFromRepo(nhsNumber, conversationId);
    //   } catch (err) {
    //     actualError = err;
    //   }
    //
    //   expect(scope.isDone()).toBe(true);
    //   expect(actualError).not.toBeNull();
    //   expect(logError).toHaveBeenCalledWith('Error retrieving health record', expectedError);
    // });
  });
});
