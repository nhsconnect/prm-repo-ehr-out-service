import { Status } from "../../../models/registration-request";
import expect from "expect";
import { logError, logInfo, logWarning } from "../../../middleware/logging";
import {
  getFragmentsTraceStatusByMessageId,
  updateFragmentsTraceStatus
} from "../../database/fragments-trace-repository";
import { transferOutFragment, isTransferRequestDuplicated } from "../transfer-out-fragment";
import { sendFragment } from "../../gp2gp/send-fragment";

jest.mock('../transfer-out-fragment');
jest.mock('../../gp2gp/send-fragment');
jest.mock('../../../services/database/fragments-trace-repository');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');

describe('transferOutFragment', () => {
  const conversationId = '6bb36755-279f-43d5-86ab-defea717d93g';
  const messageId = '970f6ef9-746f-4e81-b51f-884d64530bbd';
  const nhsNumber = '1111111112';

  describe('transfer request validation checks', () => {
    it('should validate duplicate transfer out requests', async () => {
      getFragmentsTraceStatusByMessageId.mockResolvedValueOnce({
        messageId,
        status: Status.CONTINUE_REQUEST_RECEIVED
      });

      const result = await transferOutFragment({ conversationId, messageId, nhsNumber });
      expect(logWarning).toHaveBeenCalledWith('EHR message fragment with this message ID is already in progress');
      expect(updateFragmentsTraceStatus).not.toHaveBeenCalled();
      expect(sendFragment).not.toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      let error = new Error('test error message');
      getFragmentsTraceStatusByMessageId.mockRejectedValueOnce(error);

      const result = await transferOutFragment({ conversationId, nhsNumber, messageId });

      expect(result.error).toBe('test error message');
      expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', error);
      expect(sendFragment).not.toHaveBeenCalled();
    });
  });
});