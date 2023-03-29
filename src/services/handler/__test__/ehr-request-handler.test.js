import ehrRequestHandler from '../ehr-request-handler';
import { logError, logInfo, logWarning } from '../../../middleware/logging';
import expect from "expect";

// Mocking
jest.mock('../../../middleware/logging');

describe('ehrRequestHandler', () => {
  // ============ COMMON PROPERTIES ============
  const CONVERSATION_ID = '17a757f2-f4d2-444e-a246-9cb77bef7f22';
  const EHR_REQUEST_ID = 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA';
  const NHS_NUMBER = '9692842304';
  const ODS_CODE = 'A91720';
  const EHR_REQUEST = {
    conversationId: CONVERSATION_ID,
    ehrRequestId: EHR_REQUEST_ID,
    nhsNumber: NHS_NUMBER,
    odsCode: ODS_CODE
  };
  // =================== END ===================

  it('should forward the ehr request to initiate ehr out transfer', async () => {
    // given
    const transferOutEhrCore = jest.fn();

    // when
    transferOutEhrCore.mockResolvedValue({
      inProgress: false,
      hasFailed: false
    });

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith(EHR_REQUEST);
  });

  it('should log when transfer has been started', async () => {
    // given
    const transferOutEhrCore = jest.fn();

    // when
    transferOutEhrCore.mockResolvedValue({
      inProgress: false,
      hasFailed: false
    });

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith(EHR_REQUEST);
    await expect(logInfo).toHaveBeenCalledWith('EHR transfer out started');
  });

  it('should log warning when transfer is already in progress', async () => {
    // given
    const transferOutEhrCore = jest.fn();

    // when
    transferOutEhrCore.mockResolvedValue({
      inProgress: true,
      hasFailed: false
    });

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith(EHR_REQUEST);
    await expect(logWarning).toHaveBeenCalledWith(
      'EHR out transfer with this conversation ID is already in progress'
    );
  });

  it('should log error when transfer fails due to error', async () => {
    // given
    const transferOutEhrCore = jest.fn();

    // when
    transferOutEhrCore.mockResolvedValue({
      inProgress: false,
      hasFailed: true,
      error: 'some error'
    });

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith(EHR_REQUEST);
    await expect(logError).toHaveBeenCalledWith('EHR out transfer failed due to error: some error');
  });
});
