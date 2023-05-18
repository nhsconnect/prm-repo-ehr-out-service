import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../../transfer/transfer-out-util";
import { transferOutFragments } from "../../transfer/transfer-out-fragments";
import continueMessageHandler from "../continue-message-handler";
import expect from "expect";
import { Status } from "../../../models/registration-request";
import { getNhsNumberByConversationId } from "../../database/registration-request-repository";
import { NhsNumberNotFoundError } from "../../../errors/errors";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../transfer/transfer-out-fragments');
jest.mock('../../transfer/transfer-out-util');
jest.mock('../../database/registration-request-repository');

describe('continueMessageHandler', () => {
  // ============ COMMON PROPERTIES ============
  const ODS_CODE = 'V91720';
  const NHS_NUMBER = '1692842304';
  const CONVERSATION_ID = '87a757f2-f4d2-444e-a246-9cb77bef7f22';
  const PARSED_MESSAGE = {
    conversationId: CONVERSATION_ID,
    odsCode: ODS_CODE
  }
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
    getNhsNumberByConversationId.mockReturnValueOnce(Promise.resolve(NHS_NUMBER));

    await continueMessageHandler(PARSED_MESSAGE);

    // then
    expect(transferOutFragments).toHaveBeenCalledWith(CONTINUE_REQUEST);
  });

  it('should update conversation status to SENT_FRAGMENTS if all fragment out transfers succeed', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    updateConversationStatus.mockResolvedValueOnce(undefined);
    transferOutFragments.mockResolvedValueOnce(undefined);

    await continueMessageHandler(PARSED_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.CONTINUE_REQUEST_RECEIVED);
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.SENT_FRAGMENTS);
  });

  it('should update conversation status to FRAGMENTS_SENDING_FAILED if transferOutFragments failed', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    transferOutFragments.mockRejectedValueOnce('some error');

    await continueMessageHandler(PARSED_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.CONTINUE_REQUEST_RECEIVED);
    expect(updateConversationStatus).toHaveBeenCalledWith(
      CONVERSATION_ID,
      Status.FRAGMENTS_SENDING_FAILED,
      'One or more fragments failed to send');
  });

  it('should not send fragments if ods codes of the patient and GP practice does not match', async () => {
    // when
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(false);

    await continueMessageHandler(PARSED_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(
      CONVERSATION_ID,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code');
    expect(transferOutFragments).not.toBeCalled();
  });

  it('should throw an error if cannot find an nhs number related to given conversation id', async () => {
    // when
    getNhsNumberByConversationId.mockRejectedValueOnce(new NhsNumberNotFoundError(''));

    await expect(continueMessageHandler(PARSED_MESSAGE))
        // then
        .rejects.toThrow(NhsNumberNotFoundError)

    // then
    expect(updateConversationStatus).not.toHaveBeenCalled()
    expect(transferOutFragments).not.toHaveBeenCalled();
  });
});