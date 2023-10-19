import { patientAndPracticeOdsCodesMatch, updateConversationStatus } from "../../transfer/transfer-out-util";
import {
  getNhsNumberByConversationId,
  getRegistrationRequestByConversationId
} from "../../database/registration-request-repository";
import { parseContinueRequestMessage } from "../../parser/continue-request-parser";
import {
  transferOutFragmentsForNewContinueRequest,
  transferOutFragmentsForRetriedContinueRequest
} from "../../transfer/transfer-out-fragments";
import { parseConversationId } from "../../parser/parsing-utilities";
import continueMessageHandler from "../continue-message-handler";
import { Status } from "../../../models/registration-request";
import { readFileSync } from "fs";
import expect from "expect";
import path from "path";
import {logError, logInfo, logWarning} from "../../../middleware/logging";
import {hasServiceStartedInTheLast5Minutes} from "../../../config";
import {NhsNumberNotFoundError} from "../../../errors/errors";

// Mocking
jest.mock('../../../middleware/logging');
jest.mock('../../transfer/transfer-out-fragments');
jest.mock('../../transfer/transfer-out-util');
jest.mock('../../database/registration-request-repository');
jest.mock('../../parser/continue-request-parser');
jest.mock('../../parser/parsing-utilities');
jest.mock('../../../config', () => ({
  config: jest.fn().mockReturnValue({
    sequelize: { dialect: 'postgres' },
  }),
  hasServiceStartedInTheLast5Minutes: jest.fn()
}));

describe('continueMessageHandler', () => {
  // ============ COMMON PROPERTIES ============
  const ODS_CODE = 'YGM24';
  const NHS_NUMBER = '1234567890';
  const CONVERSATION_ID = 'DBC31D30-F984-11ED-A4C4-956AA80C6B4E';
  const CONTINUE_MESSAGE = readFileSync(path.join(__dirname, "data", "continue-requests", "COPC_IN000001UK01"), "utf-8");
  // =================== END ===================

  it('should forward a new continue request to initiate fragment out transfer', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
    getNhsNumberByConversationId.mockReturnValueOnce(NHS_NUMBER);
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(true);
    updateConversationStatus.mockResolvedValueOnce(undefined);
    transferOutFragmentsForNewContinueRequest.mockResolvedValueOnce(undefined);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(parseConversationId).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(parseContinueRequestMessage).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(getRegistrationRequestByConversationId).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(getNhsNumberByConversationId).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(patientAndPracticeOdsCodesMatch).toHaveBeenCalledWith(NHS_NUMBER, ODS_CODE);
    expect(updateConversationStatus).toHaveBeenCalledWith(CONVERSATION_ID, Status.CONTINUE_REQUEST_RECEIVED);
    expect(transferOutFragmentsForNewContinueRequest).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE
    });

    expect(logInfo).toHaveBeenCalledWith('Trying to handle continue request');
  });

  /*
    'valid circumstances' in this case refers to either:
    A) A request that is marked as 'CONTINUE_REQUEST_RECEIVED' but the service has only started in the past 5 minutes,
    this indicates that the system must have crashed and just restarted, and is a valid case for a retried continue request.

    B) A request that is marked as 'FRAGMENTS_SENDING_FAILED'. In real circumstances, it's impossible (as of 11/10/2023)
    that we'd ever receive a continue request for a request marked like this, but for future proofing, we've added the ability
    to retry the fragment sending if one was to be received.
   */
  it.each([
    Status.CONTINUE_REQUEST_RECEIVED,
    Status.FRAGMENTS_SENDING_FAILED
  ])
  ('should forward a retried continue request in valid circumstances - %s', async (status) => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    getRegistrationRequestByConversationId.mockReturnValueOnce({ status });
    hasServiceStartedInTheLast5Minutes.mockReturnValueOnce(status === Status.CONTINUE_REQUEST_RECEIVED);
    getNhsNumberByConversationId.mockResolvedValueOnce(NHS_NUMBER);
    patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(true);
    transferOutFragmentsForRetriedContinueRequest.mockResolvedValueOnce(undefined);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(parseConversationId).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(parseContinueRequestMessage).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(getRegistrationRequestByConversationId).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(getNhsNumberByConversationId).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(patientAndPracticeOdsCodesMatch).toHaveBeenCalledWith(NHS_NUMBER, ODS_CODE);
    expect(transferOutFragmentsForRetriedContinueRequest).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE
    });

    expect(logInfo).toHaveBeenCalledWith('Trying to handle continue request');
  });

  it.each([
    Status.SENT_FRAGMENTS,
    Status.EHR_INTEGRATED
  ])
  ('should reject a continue request if the transfer has already successfully completed - %s', async (status) => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    getRegistrationRequestByConversationId.mockReturnValueOnce({ status })

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(parseConversationId).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(parseContinueRequestMessage).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(logInfo).toHaveBeenCalledWith('Trying to handle continue request');
    expect(logWarning).toHaveBeenCalledWith(`Ignoring duplicate continue request. Conversation ID ${CONVERSATION_ID} already completed successfully`)
  });

  it.each([
    Status.INCORRECT_ODS_CODE,
    Status.MISSING_FROM_REPO,
    Status.EHR_DOWNLOAD_FAILED,
    Status.CORE_SENDING_FAILED,
    Status.EHR_INTEGRATION_FAILED
  ])
  ('should reject a continue request if the transfer has already failed and is unable to retry - %s', async (status) => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    getRegistrationRequestByConversationId.mockReturnValueOnce({ status })

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(parseConversationId).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(parseContinueRequestMessage).toHaveBeenCalledWith(CONTINUE_MESSAGE);

    expect(logInfo).toHaveBeenCalledWith('Trying to handle continue request');
    expect(logWarning).toHaveBeenCalledWith(`Ignoring duplicate continue request. Conversation ID ${CONVERSATION_ID} already failed and is unable to retry`)

  });

  it('should reject a continue request if the transfer is still in progress', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    getRegistrationRequestByConversationId.mockReturnValueOnce({ status: Status.CONTINUE_REQUEST_RECEIVED })
    hasServiceStartedInTheLast5Minutes.mockReturnValue(false);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(parseConversationId).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(parseContinueRequestMessage).toHaveBeenCalledWith(CONTINUE_MESSAGE);
    expect(logWarning).toHaveBeenCalledWith(`Fragment transfer with conversation ID ${CONVERSATION_ID} is already in progress`);
  });

  it('should throw an error if it cannot find an nhs number related to given conversation id', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    getNhsNumberByConversationId.mockRejectedValueOnce(new NhsNumberNotFoundError());

    await expect(continueMessageHandler(CONTINUE_MESSAGE))
      // then
      .rejects.toThrow(NhsNumberNotFoundError);

    // then
    expect(updateConversationStatus).not.toHaveBeenCalled();
    expect(transferOutFragmentsForNewContinueRequest).not.toHaveBeenCalled();

    expect(logError).toHaveBeenCalledWith('Cannot find an NHS number related to given conversation ID');
  });

  it('should not send fragments if ods codes of the patient and GP practice does not match', async () => {
    // when
    parseConversationId.mockResolvedValueOnce(CONVERSATION_ID);
    parseContinueRequestMessage.mockResolvedValueOnce({ odsCode: ODS_CODE });
    patientAndPracticeOdsCodesMatch.mockReturnValueOnce(false);

    await continueMessageHandler(CONTINUE_MESSAGE);

    // then
    expect(updateConversationStatus).toHaveBeenCalledWith(
      CONVERSATION_ID,
      Status.INCORRECT_ODS_CODE,
      'Patients ODS Code in PDS does not match requesting practices ODS Code');
    expect(transferOutFragmentsForNewContinueRequest).not.toBeCalled();
  });
});
