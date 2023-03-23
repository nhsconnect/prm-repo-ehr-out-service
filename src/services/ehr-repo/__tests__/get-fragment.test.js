import nock from 'nock';
import { logError, logInfo } from '../../../middleware/logging';
import { getFragmentFromRepo } from "../get-fragment";
import { downloadFromUrl } from "../../transfer/transfer-out-util";
import { EhrUrlNotFoundError, errorMessages, PatientRecordNotFoundError } from "../../../errors/errors";

jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({
    ehrRepoAuthKeys: 'fake-keys',
    ehrRepoServiceUrl: 'http://fake-ehr-repo-url',
    sequelize: { dialect: 'postgres' }
  })
}));
jest.mock('../../transfer/transfer-out-util');


describe('getFragmentFromRepo', () => {
  describe('new ehr repo api', () => {

    const mockEhrRepoAuthKeys = 'fake-keys';
    const mockEhrRepoServiceUrl = 'http://fake-ehr-repo-url';

    const nhsNumber = '1234567890';
    const conversationIdFromEhrIn = 'fake-conversation-id'
    const messageId = 'fake-messageId';
    const headers = {
      reqheaders: { Authorization: `${mockEhrRepoAuthKeys}`}
    };

    const fragmentPresignedUrl = 'http://fake-presigned-url';
    const ehrFragment = {
      payload: "<?xml a very large xml>",
      attachments: ["attachment1", "attachment2"],
      "external_attachments": ["ext_attachment1", "ext_attachment2"]
    }

    it('should return the stored ehr fragment from ehr repo', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, {
          "conversationIdFromEhrIn": conversationIdFromEhrIn
        });

      const repoScope2 = nock(mockEhrRepoServiceUrl, headers)
        // TODO: currently this endpoint of ehr-repo doesn't work as expect. we might need to change this endpoint
        .get(`/messages/${conversationIdFromEhrIn}/${messageId}`)
        .reply(200, fragmentPresignedUrl);


      downloadFromUrl.mockImplementation((messageUrl) => {
        expect(messageUrl).toBe(fragmentPresignedUrl);
        return ehrFragment;
      })

      const result = await getFragmentFromRepo(nhsNumber, messageId);

      expect(repoScope.isDone()).toBe(true);
      expect(repoScope2.isDone()).toBe(true);

      expect(result).toEqual(ehrFragment);

      expect(logInfo).toHaveBeenCalledWith('Successfully retrieved fragment');
    });


    it('should throw an PatientRecordNotFoundError if the given nhs number is not stored in ehr-repo', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(404);

      const axios404Error = new Error('Request failed with status code 404');

      await expect(getFragmentFromRepo(nhsNumber, messageId)).rejects.toThrow(PatientRecordNotFoundError)

      expect(repoScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith(errorMessages.PATIENT_RECORD_NOT_FOUND, axios404Error);
    })


    it('should throw an generic error if ehr-repo responded with non-404 error', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(500);

      await expect(getFragmentFromRepo(nhsNumber, messageId)).rejects.toThrow(new Error('Request failed with status code 500'))

      expect(repoScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith('Failed to retrieve conversationIdFromEhrIn from ehr-repo');

    })


    it('should throw an EhrUrlNotFoundError if failed to get a presigned url for the fragment', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, {
          "conversationIdFromEhrIn": conversationIdFromEhrIn
        });

      const repoScope2 = nock(mockEhrRepoServiceUrl, headers)
        // TODO: currently this endpoint of ehr-repo doesn't work as expect. we might need to change this endpoint
        .get(`/messages/${conversationIdFromEhrIn}/${messageId}`)
        .reply(404);

      const axios404Error = new Error('Request failed with status code 404');

      await expect(getFragmentFromRepo(nhsNumber, messageId)).rejects.toThrow(EhrUrlNotFoundError)

      expect(repoScope.isDone()).toBe(true);
      expect(repoScope2.isDone()).toBe(true);

      expect(logError).toHaveBeenCalledWith(errorMessages.EHR_URL_NOT_FOUND_ERROR, axios404Error);
    })

  });
})