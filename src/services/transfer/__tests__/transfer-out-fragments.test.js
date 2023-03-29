import { Status } from "../../../models/message-fragment";
import expect from "expect";
import { logError, logInfo, logWarning } from "../../../middleware/logging";
import {
  getMessageFragmentStatusByMessageId,
} from "../../database/message-fragment-repository";
import { transferOutFragments } from "../transfer-out-fragments";
import { sendFragment } from "../../gp2gp/send-fragment";
import { updateFragmentStatus } from "../transfer-out-util";
import { getAllFragmentsWithMessageIdsFromRepo } from "../../ehr-repo/get-fragments";

// Mocking
jest.mock('../transfer-out-util');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../ehr-repo/get-fragments');
jest.mock('../../database/message-fragment-repository');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');

describe('transferOutFragment', () => {
  describe('transfer request validation checks', () => {
    // ============ COMMON PROPERTIES ============
    const CONVERSATION_ID = 'eef53f72-985c-423c-b1e4-087b702f4dd4';
    const MESSAGE_ID = 'ae6f5feb-b546-4584-be37-1eee0b343811';
    const NHS_NUMBER = '1111111112';
    const ODS_CODE = 'fake-ods-code';
    const FRAGMENTS = { nhsNumber: NHS_NUMBER, messageId: MESSAGE_ID };
    const FRAGMENT_WITH_MESSAGE_ID = {[MESSAGE_ID] : FRAGMENTS}
    // =================== END ===================

    it('should validate duplicate transfer out requests', async () => {
      // when
      getMessageFragmentStatusByMessageId.mockReturnValueOnce({
        messageId: MESSAGE_ID,
        status: Status.SENT_FRAGMENT
      });
      getAllFragmentsWithMessageIdsFromRepo.mockResolvedValueOnce(FRAGMENT_WITH_MESSAGE_ID);

      await transferOutFragments({ conversationId: CONVERSATION_ID, nhsNumber: NHS_NUMBER, odsCode: ODS_CODE});

      // then
      expect(logWarning).toHaveBeenCalledWith(`EHR message FRAGMENT with message ID ${MESSAGE_ID} has already been sent`);
      expect(updateFragmentStatus).not.toHaveBeenCalled();
      expect(sendFragment).not.toHaveBeenCalled();
    });

    it('should send fragment on success', async () => {
      // when
      getMessageFragmentStatusByMessageId.mockResolvedValue(null);
      getAllFragmentsWithMessageIdsFromRepo.mockResolvedValueOnce(FRAGMENT_WITH_MESSAGE_ID);
      sendFragment.mockResolvedValue(undefined);

      const result = await transferOutFragments({ conversationId: CONVERSATION_ID, nhsNumber: NHS_NUMBER, odsCode: ODS_CODE});

      // then
      expect(result).toBe(undefined);
      expect(getAllFragmentsWithMessageIdsFromRepo).toHaveBeenCalledWith(NHS_NUMBER);
      expect(updateFragmentStatus).toHaveBeenCalledWith(CONVERSATION_ID, MESSAGE_ID, Status.SENT_FRAGMENT);
      expect(updateFragmentStatus).not.toHaveBeenCalledWith(CONVERSATION_ID, MESSAGE_ID, Status.FRAGMENT_SENDING_FAILED);
      expect(logInfo).toHaveBeenCalledWith('EHR transfer out fragment received');
      expect(logInfo).toHaveBeenCalledWith('Fragment transfer completed');
      expect(logError).not.toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      // given
      getMessageFragmentStatusByMessageId.mockResolvedValue(null);
      getAllFragmentsWithMessageIdsFromRepo.mockResolvedValueOnce(FRAGMENT_WITH_MESSAGE_ID);

      const error = new Error('test error message');
      sendFragment.mockRejectedValue(error);

      // when
      await expect(() => transferOutFragments({ conversationId: CONVERSATION_ID, nhsNumber: NHS_NUMBER, odsCode: ODS_CODE}))
        .rejects.toThrowError(error);

      // then
      expect(logError).toHaveBeenCalledWith(`Message fragment transfer failed due to error: ${error}`);
      expect(updateFragmentStatus).toHaveBeenCalledWith(CONVERSATION_ID, MESSAGE_ID ,Status.FRAGMENT_SENDING_FAILED);

    });
  });
});