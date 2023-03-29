import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../../transfer/transfer-out-util";
import { transferOutFragments } from "../../transfer/transfer-out-fragments";
import continueMessageHandler from "../continue-message-handler";
import expect from "expect";
import { Status } from "../../../models/registration-request";
import { logInfo } from "../../../middleware/logging";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../transfer/transfer-out-fragments');
jest.mock('../../transfer/transfer-out-util');

describe('continueMessageHandler', () => {
  // ============ COMMON PROPERTIES ============
  const ODS_CODE = 'V91720';
  const NHS_NUMBER = '1692842304';
  const CONVERSATION_ID = '87a757f2-f4d2-444e-a246-9cb77bef7f22';
  const CONTINUE_REQUEST = {
    conversationId: CONVERSATION_ID,
    nhsNumber: NHS_NUMBER,
    odsCode: ODS_CODE
  }
  // =================== END ===================

  it('should forward the continue request to initiate fragment out transfer', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    transferOutFragments.mockResolvedValueOnce(undefined);
    await continueMessageHandler(CONTINUE_REQUEST);

    // then
    expect(transferOutFragments).toHaveBeenCalledWith(CONTINUE_REQUEST);
  });

  it('should update conversation status to FRAGMENTS_SENDING_FAILED if transferOutFragments failed', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    transferOutFragments.mockRejectedValueOnce('some error');

    await continueMessageHandler(CONTINUE_REQUEST);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.CONTINUE_REQUEST_RECEIVED)
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.FRAGMENTS_SENDING_FAILED, 'One or more fragments failed to send')
  });


  it('should not send fragments if ods codes of the patient and GP practice does not match', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(false);

    await continueMessageHandler(CONTINUE_REQUEST);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.INCORRECT_ODS_CODE, 'Patients ODS Code in PDS does not match requesting practices ODS Code')
    expect(transferOutFragments).not.toBeCalled()
  });

  it('should log when transfer has been started', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    updateConversationStatus.mockResolvedValueOnce(undefined);
    transferOutFragments.mockResolvedValueOnce(undefined);

    await continueMessageHandler(CONTINUE_REQUEST);

    // then
    expect(logInfo).toHaveBeenCalledWith('Trying to handle continue request');
    expect(logInfo).toBeCalledTimes(1);
  });
});