import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../../transfer/transfer-out-util";
import { getNhsNumberByConversationId } from "../../database/registration-request-repository";
import { parseContinueRequestMessage } from "../../parser/continue-request-parser";
import { transferOutFragments } from "../../transfer/transfer-out-fragments";
import { parseConversationId } from "../../parser/parsing-utilities";
import continueMessageHandler from "../continue-message-handler";
import { NhsNumberNotFoundError } from "../../../errors/errors";
import { Status } from "../../../models/registration-request";
import { readFileSync } from "fs";
import expect from "expect";
import path from "path";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../transfer/transfer-out-fragments');
jest.mock('../../transfer/transfer-out-util');
jest.mock('../../database/registration-request-repository');
jest.mock('../../parser/continue-request-parser');
jest.mock('../../parser/parsing-utilities');

describe('continueMessageHandler', () => {
  // ============ COMMON PROPERTIES ============
  const ODS_CODE = 'YGM24';
  const NHS_NUMBER = '1234567890';
  const CONVERSATION_ID = 'DBC31D30-F984-11ED-A4C4-956AA80C6B4E';
  const CONTINUE_MESSAGE = readFileSync(path.join(__dirname, "data", "continue-requests", "COPC_IN000001UK01"), "utf-8");
  // =================== END ===================

  it('should forward the continue request to initiate fragment out transfer', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    parseContinueRequestMessage.mockResolvedValueOnce(Promise.resolve({ odsCode: ODS_CODE }));
    getNhsNumberByConversationId.mockReturnValueOnce(NHS_NUMBER);
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    updateConversationStatus.mockResolvedValueOnce(undefined);
    transferOutFragments.mockResolvedValueOnce(undefined);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(transferOutFragments).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE
    });
  });

  it('should update conversation status to SENT_FRAGMENTS if all fragment out transfers succeed', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    parseContinueRequestMessage.mockResolvedValueOnce(Promise.resolve({ odsCode: ODS_CODE }));
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    updateConversationStatus.mockResolvedValueOnce(undefined);
    transferOutFragments.mockResolvedValueOnce(undefined);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.CONTINUE_REQUEST_RECEIVED);
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.SENT_FRAGMENTS);
  });

  it('should update conversation status to FRAGMENTS_SENDING_FAILED if transferOutFragments failed', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    parseContinueRequestMessage.mockResolvedValueOnce(Promise.resolve({ odsCode: ODS_CODE }));
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    transferOutFragments.mockRejectedValueOnce('some error');

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.CONTINUE_REQUEST_RECEIVED);
    expect(updateConversationStatus).toHaveBeenCalledWith(
      CONVERSATION_ID,
      Status.FRAGMENTS_SENDING_FAILED,
      'One or more fragments failed to send');
  });

  it('should not send fragments if ods codes of the patient and GP practice does not match', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    parseContinueRequestMessage.mockResolvedValueOnce(Promise.resolve({ odsCode: ODS_CODE }));
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(false);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(
      CONVERSATION_ID,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code');
    expect(transferOutFragments).not.toBeCalled();
  });

  it('should throw an error if it cannot find an nhs number related to given conversation id', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(Promise.resolve(CONVERSATION_ID));
    parseContinueRequestMessage.mockResolvedValueOnce(Promise.resolve({ odsCode: ODS_CODE }));
    getNhsNumberByConversationId.mockRejectedValueOnce(new NhsNumberNotFoundError(''));

    await expect(continueMessageHandler(CONTINUE_MESSAGE))
        // then
        .rejects.toThrow(NhsNumberNotFoundError)

    // then
    expect(updateConversationStatus).not.toHaveBeenCalled()
    expect(transferOutFragments).not.toHaveBeenCalled();
  });
});