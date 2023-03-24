import { Status } from "../../../models/fragments-trace";
import expect from "expect";
import { logError, logInfo, logWarning } from "../../../middleware/logging";
import {
  getFragmentsTraceStatusByMessageId,
} from "../../database/fragments-trace-repository";
import { transferOutFragment } from "../transfer-out-fragment";
import { sendFragment } from "../../gp2gp/send-fragment";
import { updateFragmentStatus } from "../transfer-out-util";
import { getFragmentFromRepo } from "../../ehr-repo/get-fragment";


jest.mock('../transfer-out-util');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../ehr-repo/get-fragment');
jest.mock('../../database/fragments-trace-repository');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');
jest.mock('../../gp2gp/pds-retrieval-request');

describe('transferOutFragment', () => {
  const conversationId = '6bb36755-279f-43d5-86ab-defea717d93g';
  const messageId = '970f6ef9-746f-4e81-b51f-884d64530bbd';
  const nhsNumber = '1111111112';
  const fragment = {
    nhsNumber: nhsNumber,
    messageId: messageId
  }

  describe('transfer request validation checks', () => {
    it('should validate duplicate transfer out requests', async () => {
      // when
      getFragmentsTraceStatusByMessageId.mockReturnValueOnce({
        messageId,
        status: Status.FRAGMENT_REQUEST_RECEIVED
      });

      await transferOutFragment({ conversationId, messageId, nhsNumber });

      // then
      expect(logWarning).toHaveBeenCalledWith('EHR message fragment with this message ID is already in progress');
      expect(updateFragmentStatus).not.toHaveBeenCalled();

      expect(sendFragment).not.toHaveBeenCalled();
    });

    it('should send fragment on success', async () => {
      // when
      getFragmentsTraceStatusByMessageId.mockResolvedValueOnce(null);
      getFragmentFromRepo.mockResolvedValueOnce(fragment);

      const result = await transferOutFragment(conversationId, messageId, nhsNumber);

      // then
      expect(result).toBe(undefined);
      expect(getFragmentFromRepo).toHaveBeenCalledWith(nhsNumber, messageId);
      expect(updateFragmentStatus).toHaveBeenCalledWith(conversationId, messageId, Status.SENT_FRAGMENT);
      expect(updateFragmentStatus).not.toHaveBeenCalledWith(conversationId, messageId, Status.FRAGMENT_SENDING_FAILED);
      expect(logInfo).toHaveBeenCalledWith('EHR transfer out fragment received');
      expect(logInfo).toHaveBeenCalledWith('Fragment transfer completed');
      expect(logError).not.toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      // given
      const error = new Error('test error message');
      sendFragment.mockRejectedValueOnce(error);
      // when
      const result = await transferOutFragment( conversationId, nhsNumber, messageId );
      // then
      expect(logError).toHaveBeenCalledWith(`Message fragment transfer failed due to error: ${error}`);
      expect(updateFragmentStatus).not.toHaveBeenCalled();
      expect(result).toBe('test error message');
    });
  });
});