import { Status } from '../../../models/message-fragment';
import expect from 'expect';
import { logError, logInfo, logWarning } from '../../../middleware/logging';
import { getMessageFragmentStatusByMessageId } from '../../database/message-fragment-repository';
import { createMessageFragment } from '../../database/create-message-fragment';
import { transferOutFragments } from '../transfer-out-fragments';
import { sendFragment } from '../../gp2gp/send-fragment';
import { updateFragmentStatus, updateAllFragmentsMessageIds } from '../transfer-out-util';
import { getAllFragmentsWithMessageIdsFromRepo } from '../../ehr-repo/get-fragments';

// Mocking
jest.mock('../transfer-out-util');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../ehr-repo/get-fragments');
jest.mock('../../database/create-message-fragment');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');

describe('transferOutFragment', () => {
  // ============ COMMON PROPERTIES ============
  const CONVERSATION_ID = 'eef53f72-985c-423c-b1e4-087b702f4dd4';
  const MESSAGE_ID = 'ae6f5feb-b546-4584-be37-1eee0b343811';
  const NEW_MESSAGE_ID = 'F0A3D766-52CC-458D-9F6A-12933DE83F03';
  const NHS_NUMBER = '1111111112';
  const ODS_CODE = 'fake-ods-code';
  const FRAGMENT = { nhsNumber: NHS_NUMBER, messageId: MESSAGE_ID };
  const FRAGMENT_WITH_MESSAGE_ID = { [MESSAGE_ID]: FRAGMENT };
  const UPDATED_FRAGMENT = { nhsNumber: NHS_NUMBER, messageId: NEW_MESSAGE_ID };
  const FRAGMENT_WITH_NEW_MESSAGE_ID = { [NEW_MESSAGE_ID]: UPDATED_FRAGMENT };
  // =================== END ===================

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should send fragment on success', async () => {
    // when
    getMessageFragmentStatusByMessageId.mockResolvedValue(null);
    getAllFragmentsWithMessageIdsFromRepo.mockResolvedValueOnce(FRAGMENT_WITH_MESSAGE_ID);
    updateAllFragmentsMessageIds.mockResolvedValue(FRAGMENT_WITH_NEW_MESSAGE_ID);
    sendFragment.mockResolvedValue(undefined);

    const result = await transferOutFragments({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE
    });

    // then
    expect(result).toBe(undefined);
    expect(getAllFragmentsWithMessageIdsFromRepo).toHaveBeenCalledWith(NHS_NUMBER);
    expect(updateFragmentStatus).toHaveBeenCalledTimes(1);
    expect(updateFragmentStatus).toHaveBeenCalledWith(
      CONVERSATION_ID,
      NEW_MESSAGE_ID,
      Status.SENT_FRAGMENT
    );
    expect(updateAllFragmentsMessageIds).toHaveBeenCalledWith([FRAGMENT]);
    expect(logInfo).toHaveBeenCalledWith('Start EHR fragment transfer');
    expect(logInfo).toHaveBeenCalledWith('Fragment transfer completed');
    expect(logError).not.toHaveBeenCalled();
  });

  describe('transfer request validation and error checks', () => {
    it('should validate duplicate transfer out requests', async () => {
      // when
      getMessageFragmentStatusByMessageId.mockReturnValueOnce({
        messageId: MESSAGE_ID,
        status: Status.SENT_FRAGMENT
      });
      getAllFragmentsWithMessageIdsFromRepo.mockResolvedValueOnce(FRAGMENT_WITH_MESSAGE_ID);
      updateAllFragmentsMessageIds.mockResolvedValue(FRAGMENT_WITH_NEW_MESSAGE_ID);

      await transferOutFragments({
        conversationId: CONVERSATION_ID,
        nhsNumber: NHS_NUMBER,
        odsCode: ODS_CODE
      });

      // then
      expect(logWarning).toHaveBeenCalledWith(
        `EHR message FRAGMENT with message ID ${NEW_MESSAGE_ID} has already been sent`
      );
      expect(updateFragmentStatus).not.toHaveBeenCalled();
      expect(sendFragment).not.toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      // given
      getMessageFragmentStatusByMessageId.mockResolvedValue(null);
      getAllFragmentsWithMessageIdsFromRepo.mockResolvedValueOnce(FRAGMENT_WITH_MESSAGE_ID);
      updateAllFragmentsMessageIds.mockResolvedValue(FRAGMENT_WITH_NEW_MESSAGE_ID);

      const error = new Error('test error message');
      sendFragment.mockRejectedValue(error);

      // when
      await expect(() =>
        transferOutFragments({
          conversationId: CONVERSATION_ID,
          nhsNumber: NHS_NUMBER,
          odsCode: ODS_CODE
        })
      ).rejects.toThrowError(error);

      // then
      expect(logError).toHaveBeenCalledWith(
        `Message fragment transfer failed due to error: ${error}`
      );
      expect(updateFragmentStatus).toHaveBeenCalledWith(
        CONVERSATION_ID,
        NEW_MESSAGE_ID,
        Status.FRAGMENT_SENDING_FAILED
      );
    });
  });
});
