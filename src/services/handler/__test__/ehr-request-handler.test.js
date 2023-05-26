import ehrRequestHandler from '../ehr-request-handler';
import { logError, logInfo, logWarning } from '../../../middleware/logging';
import expect from "expect";
import { parseConversationId } from "../../parser/parsing-utilities";
import { parseEhrRequestMessage } from "../../parser/ehr-request-parser";
import { transferOutEhrCore } from "../../transfer/transfer-out-ehr-core";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../parser/parsing-utilities');
jest.mock('../../parser/ehr-request-parser');
jest.mock('../../transfer/transfer-out-ehr-core');

describe('ehrRequestHandler', () => {
  // ============ COMMON PROPERTIES ============
  const CONVERSATION_ID = '17a757f2-f4d2-444e-a246-9cb77bef7f22';
  const EHR_REQUEST_ID = 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA';
  const NHS_NUMBER = '9692842304';
  const ODS_CODE = 'A91720';
  const EHR_REQUEST = {
    nhsNumber: NHS_NUMBER,
    odsCode: ODS_CODE,
    ehrRequestId: EHR_REQUEST_ID
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
    // when
    parseEhrRequestMessage.mockResolvedValueOnce(Promise.resolve(EHR_REQUEST));
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    transferOutEhrCore.mockResolvedValue(Promise.resolve({
      inProgress: false,
      hasFailed: false
    }));

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nhsNumber: EHR_REQUEST.nhsNumber,
      odsCode: EHR_REQUEST.odsCode,
      ehrRequestId: EHR_REQUEST.ehrRequestId
    });
    await expect(logInfo).toHaveBeenCalledWith('EHR transfer out started');
  });

  it('should log warning when transfer is already in progress', async () => {
    // when
    parseEhrRequestMessage.mockResolvedValueOnce(Promise.resolve(EHR_REQUEST));
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    transferOutEhrCore.mockResolvedValue(Promise.resolve({
      inProgress: true,
      hasFailed: false
    }));

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nhsNumber: EHR_REQUEST.nhsNumber,
      odsCode: EHR_REQUEST.odsCode,
      ehrRequestId: EHR_REQUEST.ehrRequestId
    });
    await expect(logWarning).toHaveBeenCalledWith(
      'EHR out transfer with this conversation ID is already in progress'
    );
  });

  it('should log error when transfer fails due to error', async () => {
    // when
    parseEhrRequestMessage.mockResolvedValueOnce(Promise.resolve(EHR_REQUEST));
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    transferOutEhrCore.mockResolvedValue(Promise.resolve({
      inProgress: false,
      hasFailed: true,
      error: 'some error'
    }));

    await ehrRequestHandler(EHR_REQUEST, { transferOutEhrCore });

    // then
    await expect(transferOutEhrCore).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nhsNumber: EHR_REQUEST.nhsNumber,
      odsCode: EHR_REQUEST.odsCode,
      ehrRequestId: EHR_REQUEST.ehrRequestId
    });
    await expect(logError).toHaveBeenCalledWith('EHR out transfer failed due to error: some error');
  });
});
