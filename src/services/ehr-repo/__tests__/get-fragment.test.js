import nock from 'nock';
import { logError, logInfo } from '../../../middleware/logging';
import { getFragmentFromRepo } from "../get-fragment";
import { downloadFromUrl } from "../../transfer/transfer-out-util";
import {EhrUrlNotFoundError} from "../../../errors/errors";

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
    const ehrInConversationId = 'fake-ehr-in-conversation-id'
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
          "conversationIdFromEhrIn": ehrInConversationId
        });

      const repoScope2 = nock(mockEhrRepoServiceUrl, headers)
        // TODO: currently this endpoint of ehr-repo doesn't work as expect. we might need to change this endpoint
        .get(`/messages/${ehrInConversationId}/${messageId}`)
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

    it('should raise an url not found error if fail to get a presigned url', async () => {
      const repoScope = nock(mockEhrRepoServiceUrl, headers)
        .get(`/patients/${nhsNumber}`)
        .reply(200, {
          "conversationIdFromEhrIn": ehrInConversationId
        });

      const repoScope2 = nock(mockEhrRepoServiceUrl, headers)
        // TODO: currently this endpoint of ehr-repo doesn't work as expect. we might need to change this endpoint
        .get(`/messages/${ehrInConversationId}/${messageId}`)
        .reply(404);

      expect(getFragmentFromRepo(nhsNumber, messageId)).rejects().toThrow(EhrUrlNotFoundError)
      // })
      // try {
      //   await getFragmentFromRepo(nhsNumber, messageId);
      // } catch (error) {
      //   expect(error).toBeInstanceOf(EhrUrlNotFoundError);
      // }

      expect(repoScope.isDone()).toBe(true);
      expect(repoScope2.isDone()).toBe(true);

    })
  });
})