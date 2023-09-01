import expect from 'expect';
import {logError, logInfo} from '../../../middleware/logging';
import {transferOutFragments} from '../transfer-out-fragments';
import {sendFragment} from '../../gp2gp/send-fragment';
import {updateFragmentMessageId} from '../transfer-out-util';
import {getFragment, retrieveIdsFromEhrRepo} from '../../ehr-repo/get-fragments';

// Mocking
jest.mock('../transfer-out-util');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../ehr-repo/get-fragments');
jest.mock('../../database/create-fragment-db-record');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({sequelize: {dialect: 'postgres'}})
}));
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');

describe('transferOutFragment', () => {
  // ============ COMMON PROPERTIES ============
  const ODS_CODE = 'B12345';
  const NHS_NUMBER = 1234567890;
  const INBOUND_CONVERSATION_ID = 'a52e8782-2268-4d49-ab69-5fcfa10eb43a';
  const ORIGINAL_MESSAGE_ID = '2526ea9f-f800-461d-8046-8bc512920d23';
  const UPDATED_MESSAGE_ID = '7B2D6A16-2C50-4BF8-A923-E14003816ECC';
  const FRAGMENT = {ebXML: '', payload: '', attachments: [], externalAttachments: []};

  const EHR_REPOSITORY_RESPONSE = {
    conversationIdFromEhrIn: INBOUND_CONVERSATION_ID,
    messageIds: [ORIGINAL_MESSAGE_ID]
  };

  const UPDATED_FRAGMENT = {
    newMessageId: UPDATED_MESSAGE_ID,
    message: FRAGMENT
  };
  // =================== END ===================

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should send fragment on success', async () => {
    // when
    retrieveIdsFromEhrRepo.mockResolvedValueOnce(EHR_REPOSITORY_RESPONSE);
    getFragment.mockResolvedValueOnce(FRAGMENT);
    updateFragmentMessageId.mockResolvedValueOnce(UPDATED_FRAGMENT);
    sendFragment.mockResolvedValueOnce(undefined);

    const result = await transferOutFragments({
      conversationId: INBOUND_CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE
    });

    // then
    expect(result).toBe(undefined);
    expect(retrieveIdsFromEhrRepo).toBeCalledWith(NHS_NUMBER);
    expect(getFragment).toHaveBeenCalledWith(
      INBOUND_CONVERSATION_ID,
      EHR_REPOSITORY_RESPONSE.messageIds[0]
    );
    expect(updateFragmentMessageId).toHaveBeenCalledWith(FRAGMENT);
    expect(sendFragment).toHaveBeenCalledWith(
      INBOUND_CONVERSATION_ID,
      ODS_CODE,
      FRAGMENT,
      UPDATED_MESSAGE_ID
    );
    expect(logInfo).toHaveBeenCalledTimes(4);
    expect(logInfo).toHaveBeenCalledWith('Initiated EHR Fragment transfer.');
    expect(logInfo).toHaveBeenCalledWith(
      'Retrieved Inbound Conversation ID and all Message IDs for transfer.'
    );
    expect(logInfo).toHaveBeenCalledWith(
      `Fragment 1 of 1 sent to the GP2GP Messenger - with old Message ID ${ORIGINAL_MESSAGE_ID}, and new Message ID ${UPDATED_MESSAGE_ID}.`
    );
    expect(logInfo).toHaveBeenCalledWith('Fragment transfer completed.');
  });

  describe('transfer request validation and error checks', () => {
    it('should handle exceptions', async () => {
      // when
      retrieveIdsFromEhrRepo.mockResolvedValueOnce(EHR_REPOSITORY_RESPONSE);
      getFragment.mockResolvedValueOnce(FRAGMENT);
      updateFragmentMessageId.mockResolvedValueOnce(UPDATED_FRAGMENT);
      const error = new Error('test error message');
      sendFragment.mockRejectedValue(error);

      await transferOutFragments({
        conversationId: INBOUND_CONVERSATION_ID,
        nhsNumber: NHS_NUMBER,
        odsCode: ODS_CODE
      });

      // then
      expect(logError).toHaveBeenCalledWith(
        `An error occurred while attempting to transfer the fragments from the EHR Repository - details ${error}.`
      );
    });
  });
});
