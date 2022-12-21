import ehrRequestHandler from '../ehrRequestHandler';
import { logError, logInfo, logWarning } from '../../../middleware/logging';

jest.mock('../../../middleware/logging');

describe('ehrRequestHandler', () => {
  it('should forward the ehr request to initiate ehr out transfer', async () => {
    let ehrRequest = {
      conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
      ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
      nhsNumber: '9692842304',
      odsCode: 'A91720'
    };

    const transferOutEhr = jest.fn();
    transferOutEhr.mockResolvedValue({
      inProgress: false,
      hasFailed: false
    });

    await ehrRequestHandler(ehrRequest, { transferOutEhr });

    await expect(transferOutEhr).toHaveBeenCalledWith(ehrRequest);
  });

  it('should log when transfer occurs successfully', async () => {
    let ehrRequest = {
      conversationId: 'convo',
      ehrRequestId: 'ehrRequestId',
      nhsNumber: '9876543210',
      odsCode: 'BBGUN1'
    };

    const transferOutEhr = jest.fn();
    transferOutEhr.mockResolvedValue({
      inProgress: false,
      hasFailed: false
    });

    await ehrRequestHandler(ehrRequest, { transferOutEhr });

    await expect(transferOutEhr).toHaveBeenCalledWith(ehrRequest);
    await expect(logInfo).toHaveBeenCalledWith('EHR transfer out started');
  });

  it('should log warning when transfer is already in progress', async () => {
    let ehrRequest = {
      conversationId: 'convo',
      ehrRequestId: 'ehrRequestId',
      nhsNumber: '9876543210',
      odsCode: 'BBGUN1'
    };

    const transferOutEhr = jest.fn();
    transferOutEhr.mockResolvedValue({
      inProgress: true,
      hasFailed: false
    });

    await ehrRequestHandler(ehrRequest, { transferOutEhr });

    await expect(transferOutEhr).toHaveBeenCalledWith(ehrRequest);
    await expect(logWarning).toHaveBeenCalledWith('EHR out transfer with this conversation ID is already in progress');
  });

  it('should log error when transfer fails due to error', async () => {
    let ehrRequest = {
      conversationId: 'convo',
      ehrRequestId: 'ehrRequestId',
      nhsNumber: '9876543210',
      odsCode: 'BBGUN1'
    };

    const transferOutEhr = jest.fn();
    transferOutEhr.mockResolvedValue({
      inProgress: false,
      hasFailed: true,
      error: 'some error'
    });

    await ehrRequestHandler(ehrRequest, { transferOutEhr });

    await expect(transferOutEhr).toHaveBeenCalledWith(ehrRequest);
    await expect(logError).toHaveBeenCalledWith('EHR out transfer failed due to error: some error');
  });
});
