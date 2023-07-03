import { EhrUrlNotFoundError, DownloadError, errorMessages} from "../../../errors/errors";
import { logError, logInfo } from '../../../middleware/logging';
import { getEhrCoreAndFragmentIdsFromRepo } from "../get-ehr";
import nock from 'nock';

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({
    sequelize: { dialect: 'postgres' },
    ehrRepoAuthKeys: 'fake-keys',
    ehrRepoServiceUrl: 'http://localhost'
  })
}));

describe('getEhrCoreAndFragmentIdsFromRepo', () => {
  describe('new ehr repo api', () => {
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

      const res = await getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId);

      expect(urlScope.isDone()).toBe(true);
      expect(ehrScope.isDone()).toBe(true);
      expect(res.ehrCore).toEqual(ehrCore);
    });

    it('should return an array of fragment message id when the patients health record is a large EHR record', async () => {
      // given
      const fragmentMessageIds = ['message-id-1', 'message-id-2'];
      const largeEhrResponse = {
        coreMessageUrl,
        fragmentMessageIds,
        conversationIdFromEhrIn: conversationIdFromEhrIn
      };

      // when
      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, largeEhrResponse);

      const ehrScope = nock(coreMessageUrl)
        .get("/")
        .reply(200, ehrCore);

      const res = await getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId);

      // then
      expect(urlScope.isDone()).toBe(true);
      expect(ehrScope.isDone()).toBe(true);

      expect(res.ehrCore).toEqual(ehrCore);
      expect(res.fragmentMessageIds).toEqual(fragmentMessageIds);
      expect(logInfo).toHaveBeenCalledWith(`Successfully retrieved fragment message ids`);
    })


      it('should throw an error when attempting to retrieve a presigned url and patient does not exist in repo', async () => {
      const expectedError = new Error('Request failed with status code 404');
      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(404, expectedError);

      await expect(() => getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId))
        .rejects.toThrow(EhrUrlNotFoundError);
      expect(urlScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith(errorMessages.EHR_URL_NOT_FOUND_ERROR, expectedError);
    });

    it('should throw an error when failing to retrieve a presigned url with non-404 response', async () => {
      const urlScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(500);

      await expect(() => getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId))
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

      await expect(() => getEhrCoreAndFragmentIdsFromRepo(nhsNumber, conversationId))
        .rejects.toThrow(DownloadError);

      expect(ehrScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith(errorMessages.DOWNLOAD_ERROR, expectedError);
    });
  });
});
