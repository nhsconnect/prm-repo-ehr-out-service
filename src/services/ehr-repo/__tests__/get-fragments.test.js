import nock from 'nock';
import { logError, logInfo } from '../../../middleware/logging';
import { getAllFragmentsWithMessageIdsFromRepo } from "../get-fragments";
import { downloadFromUrl } from "../../transfer/transfer-out-util";
import { getMessageFragmentStatusByMessageId} from "../../database/message-fragment-repository";
import { EhrUrlNotFoundError, errorMessages, PatientRecordNotFoundError } from "../../../errors/errors";

jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({
    ehrRepoAuthKeys: 'fake-keys',
    ehrRepoServiceUrl: 'http://fake-ehr-repo-url',
    sequelize: { dialect: 'postgres' },
    use_rds_credentials: false
  })
}));
jest.mock('../../database/fragments-trace-repository');
jest.mock('../../transfer/transfer-out-util');


describe('getAllFragmentsFromRepo', () => {
  describe('new ehr repo api', () => {

    const mockEhrRepoAuthKeys = 'fake-keys';
    const mockEhrRepoServiceUrl = 'http://fake-ehr-repo-url';

    const nhsNumber = '1234567890';
    const conversationIdFromEhrIn = 'fake-conversation-id'
    const messageIds = ['fake-messageId1', 'fake-messageId2', 'fake-messageId3'];
    const headers = {
      reqheaders: { Authorization: `${mockEhrRepoAuthKeys}`}
    };

    const fragmentPresignedUrlRoot = 'http://fake-presigned-url/';

    const ehrFragment = {
      payload: "<?xml a very large xml>",
      attachments: ["attachment1", "attachment2"],
      "external_attachments": ["ext_attachment1", "ext_attachment2"]
    };

    it('should return the stored ehr fragments from ehr repo', async () => {
      getMessageFragmentStatusByMessageId.mockReturnValue(null);

      const repoScopeForIds = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, {
          "conversationIdFromEhrIn": conversationIdFromEhrIn,
          "fragmentMessageIds": messageIds
        });

      const repoScopeForFragments = nock(mockEhrRepoServiceUrl, headers);
      for (const messageId of messageIds) {
        repoScopeForFragments
          // TODO: currently this endpoint of ehr-repo doesn't work as expect. we might need to change this endpoint

          .get(`/messages/${conversationIdFromEhrIn}/${messageId}`)
          .reply(200, fragmentPresignedUrlRoot + messageId)
      }

      const expectedFragmentPresignedUrls = messageIds.map(messageId => 'http://fake-presigned-url/' + messageId);

      downloadFromUrl.mockImplementation((messageUrl) => {
        expect(expectedFragmentPresignedUrls).toContain(messageUrl);
        return ehrFragment;
      })

      const expected = {
        [messageIds[0]]: ehrFragment,
        [messageIds[1]]: ehrFragment,
        [messageIds[2]]: ehrFragment,
      }
      const actual = await getAllFragmentsWithMessageIdsFromRepo(nhsNumber);

      expect(repoScopeForIds.isDone()).toBe(true);
      expect(repoScopeForFragments.isDone()).toBe(true);

      expect(actual).toEqual(expected);

      expect(logInfo).toHaveBeenCalledWith('Successfully retrieved all fragments');
    });


    it('should throw an PatientRecordNotFoundError if the given nhs number is not stored in ehr-repo', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(404);

      const axios404Error = new Error('Request failed with status code 404');

      await expect(getAllFragmentsWithMessageIdsFromRepo(nhsNumber)).rejects.toThrow(PatientRecordNotFoundError)

      expect(repoScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith(errorMessages.PATIENT_RECORD_NOT_FOUND_ERROR, axios404Error);
    })


    it('should throw an generic error if ehr-repo responded with non-404 error', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(500);

      await expect(getAllFragmentsWithMessageIdsFromRepo(nhsNumber)).rejects.toThrow(new Error('Request failed with status code 500'))

      expect(repoScope.isDone()).toBe(true);
      expect(logError).toHaveBeenCalledWith('Failed to retrieve conversationIdFromEhrIn from ehr-repo');

    })


    it('should throw an EhrUrlNotFoundError if failed to get a presigned url for the fragment', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, {
          "conversationIdFromEhrIn": conversationIdFromEhrIn,
          "fragmentMessageIds": messageIds
        });

      // emulate the case that message-id [1] don't have a presigned url
      const repoScopeForFragments = nock(mockEhrRepoServiceUrl, headers);
      for (const messageId of [messageIds[0], messageIds[2]]) {
        repoScopeForFragments
          .get(`/messages/${conversationIdFromEhrIn}/${messageId}`)
          .reply(200, fragmentPresignedUrlRoot + messageId)
      }
      repoScopeForFragments
        .get(`/messages/${conversationIdFromEhrIn}/${messageIds[1]}`)
        .reply(404)

      const axios404Error = new Error('Request failed with status code 404');

      await expect(getAllFragmentsWithMessageIdsFromRepo(nhsNumber)).rejects.toThrow(EhrUrlNotFoundError)

      expect(repoScope.isDone()).toBe(true);
      expect(repoScopeForFragments.isDone()).toBe(true);

      expect(logError).toHaveBeenCalledWith(errorMessages.EHR_URL_NOT_FOUND_ERROR, axios404Error);
    })

  });
})