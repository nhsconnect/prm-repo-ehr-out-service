import expect from 'expect';
import { logInfo } from '../../../middleware/logging';
import { transferOutFragmentsForNewContinueRequest } from '../transfer-out-fragments';
import { sendFragment } from '../../gp2gp/send-fragment';
import { updateFragmentMessageIds } from '../transfer-out-util';
import { getFragment, getMessageIdsFromEhrRepo } from '../../ehr-repo/get-fragment';

// Mocking
jest.mock('../transfer-out-util');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../ehr-repo/get-fragment');
jest.mock('../../database/create-fragment-db-record');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({
    sequelize: {dialect: 'postgres'},
    rateLimitTimeoutMilliseconds: 1000
  })
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
    getMessageIdsFromEhrRepo.mockResolvedValueOnce(ehrRepositoryResponse);
    getFragment.mockResolvedValueOnce(fragment);
    updateFragmentMessageIds.mockResolvedValueOnce(updatedFragment);
    sendFragment.mockResolvedValueOnce(undefined);

    const result = await transferOutFragmentsForNewContinueRequest({
      conversationId: inboundConversationId,
      nhsNumber: nhsNumber,
      odsCode: odsCode
    });

    // then
    expect(result).toBe(undefined);
    expect(getMessageIdsFromEhrRepo).toBeCalledWith(nhsNumber);
    expect(getFragment).toHaveBeenCalledWith(
      inboundConversationId,
      ehrRepositoryResponse.messageIds[0]
    );
    expect(updateFragmentMessageIds).toHaveBeenCalledWith(fragment);
    expect(sendFragment).toHaveBeenCalledWith(
      inboundConversationId,
      odsCode,
      fragment,
      updatedMessageId
    );
    expect(logInfo).toHaveBeenCalledTimes(4);
    expect(logInfo).toHaveBeenCalledWith(`Initiated the EHR Fragment transfer for Inbound Conversation ID ${inboundConversationId}.`);
    expect(logInfo).toHaveBeenCalledWith('Retrieved Inbound Conversation ID and all Message IDs for transfer.');
    expect(logInfo).toHaveBeenCalledWith(`Fragment 1 of 1 sent to the GP2GP Messenger - with old Message ID ${originalMessageId}, and new Message ID ${updatedMessageId}.`);
    expect(logInfo).toHaveBeenCalledWith(`All fragments have been successfully sent to GP2GP Messenger, Inbound Conversation ID: ${inboundConversationId}`);
  });
});
