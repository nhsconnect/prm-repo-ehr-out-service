import expect from 'expect';
import {logError, logInfo} from '../../../middleware/logging';
import {transferOutFragments} from '../transfer-out-fragments';
import {sendFragment} from '../../gp2gp/send-fragment';
import {updateFragmentMessageId} from '../transfer-out-util';
import {getFragment, retrieveIdsFromEhrRepo} from '../../ehr-repo/get-fragment';

// Mocking
jest.mock('../transfer-out-util');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../ehr-repo/get-fragment');
jest.mock('../../database/create-fragment-db-record');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({sequelize: {dialect: 'postgres'}})
}));
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');

describe('transferOutFragment', () => {
  // ============ COMMON PROPERTIES ============
  const odsCode = 'B12345';
  const nhsNumber = 1234567890;
  const inboundConversationId = 'a52e8782-2268-4d49-ab69-5fcfa10eb43a';
  const originalMessageId = '2526ea9f-f800-461d-8046-8bc512920d23';
  const updatedMessageId = '7B2D6A16-2C50-4BF8-A923-E14003816ECC';
  const fragment = {ebXML: '', payload: '', attachments: [], externalAttachments: []};

  const ehrRepositoryResponse = {
    conversationIdFromEhrIn: inboundConversationId,
    messageIds: [originalMessageId]
  };

  const updatedFragment = {
    newMessageId: updatedMessageId,
    message: fragment
  };
  // =================== END ===================

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should send fragment on success', async () => {
    // when
    retrieveIdsFromEhrRepo.mockResolvedValueOnce(ehrRepositoryResponse);
    getFragment.mockResolvedValueOnce(fragment);
    updateFragmentMessageId.mockResolvedValueOnce(updatedFragment);
    sendFragment.mockResolvedValueOnce(undefined);

    const result = await transferOutFragments({
      conversationId: inboundConversationId,
      nhsNumber: nhsNumber,
      odsCode: odsCode
    });

    // then
    expect(result).toBe(undefined);
    expect(retrieveIdsFromEhrRepo).toBeCalledWith(nhsNumber);
    expect(getFragment).toHaveBeenCalledWith(
      inboundConversationId,
      ehrRepositoryResponse.messageIds[0]
    );
    expect(updateFragmentMessageId).toHaveBeenCalledWith(fragment);
    expect(sendFragment).toHaveBeenCalledWith(
      inboundConversationId,
      odsCode,
      fragment,
      updatedMessageId
    );
    expect(logInfo).toHaveBeenCalledTimes(4);
    expect(logInfo).toHaveBeenCalledWith('Initiated EHR Fragment transfer.');
    expect(logInfo).toHaveBeenCalledWith(
      'Retrieved Inbound Conversation ID and all Message IDs for transfer.'
    );
    expect(logInfo).toHaveBeenCalledWith(
      `Fragment 1 of 1 sent to the GP2GP Messenger - with old Message ID ${originalMessageId}, and new Message ID ${updatedMessageId}.`
    );
    expect(logInfo).toHaveBeenCalledWith('Fragment transfer completed.');
  });

  describe('transfer request validation and error checks', () => {
    it('should handle exceptions', async () => {
      // when
      retrieveIdsFromEhrRepo.mockResolvedValueOnce(ehrRepositoryResponse);
      getFragment.mockResolvedValueOnce(fragment);
      updateFragmentMessageId.mockResolvedValueOnce(updatedFragment);
      const error = new Error('test error message');
      sendFragment.mockRejectedValue(error);

      await transferOutFragments({
        conversationId: inboundConversationId,
        nhsNumber: nhsNumber,
        odsCode: odsCode
      });

      // then
      expect(logError).toHaveBeenCalledWith(
        `An error occurred while attempting to transfer the fragments from the EHR Repository - details ${error}.`
      );
    });
  });
});
