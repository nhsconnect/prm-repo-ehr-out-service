import nock from 'nock';
import { logError } from '../../../middleware/logging';
import { config } from '../../../config';
import { getEhrCoreFromRepo } from "../get-ehr";
import { EhrUrlNotFoundError, DownloadError} from "../../../errors/errors";

jest.mock('../../../middleware/logging');
jest.mock('../../../config');

describe('getEhrCoreFromRepo', () => {
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

      const res = await getEhrCoreFromRepo(nhsNumber, conversationId);

      expect(urlScope.isDone()).toBe(true);
      expect(ehrScope.isDone()).toBe(true);
      expect(res).toEqual(ehrCore);
    });

    it('should throw an error when attempting to retrieve a presigned url and patient does not exist in repo', async () => {
      const expectedError = new Error('Request failed with status code 404');
      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(404, expectedError);

      await expect(() => getEhrCoreFromRepo(nhsNumber, conversationId))
        .rejects.toThrow(EhrUrlNotFoundError);
      expect(urlScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith('Cannot find complete patient health record', expectedError);
    });

    it('should throw an error when failing to retrieve a presigned url with non-404 response', async () => {
      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(500);

      await expect(() => getEhrCoreFromRepo(nhsNumber, conversationId))
        .rejects.toThrow("Request failed with status code 500");
      expect(urlScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith('Error retrieving health record', new Error("Request failed with status code 500"));
    });

    it('should throw an error when failing to retrieve ehr core from presigned url', async () => {
      const expectedError = new Error('Request failed with status code 500');

      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, ehrIsPresentEhrRepoUrlResponse);

      const ehrScope = nock(coreMessageUrl)
        .get("/")
        .reply(500);

      await expect(() => getEhrCoreFromRepo(nhsNumber, conversationId))
        .rejects.toThrow(DownloadError);

      expect(urlScope.isDone()).toBe(true);
      expect(ehrScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith('Cannot retrieve EHR from presigned URL', expectedError);
    });
  });
});
