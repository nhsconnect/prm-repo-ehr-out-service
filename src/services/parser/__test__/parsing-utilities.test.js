import path from "path";
import expect from "expect";
import { readFileSync } from "fs";
import { parseConversationId, parseInteractionId } from "../parsing-utilities";
import { validateFieldsHaveSuccessfullyParsed } from "../parsing-validation";

// Mocking
jest.mock("../parsing-validation");

describe('parsing-utilities.js', () => {
  // ============ COMMON PROPERTIES ============
  const exampleEhrRequest = readFileSync(path.join(__dirname, "data", "ehr-requests", "RCMR_IN010000UK05"), "utf-8");
  const exampleContinueRequest = readFileSync(path.join(__dirname, "data", "continue-requests", "COPC_IN000001UK01"), "utf-8");
  const exampleNegativeAcknowledgement = readFileSync(path.join(__dirname, "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_01"), "utf-8");
  // =================== END ===================

  it('should parse the interaction ID successfully, given a EHR Request', async () => {
    // given
    const interactionID = "RCMR_IN010000UK05";

    // when
    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    const parsedInteractionId = await parseInteractionId(exampleEhrRequest);

    // then
    expect(parsedInteractionId).toEqual(interactionID);
  });

  it('should parse the interaction ID successfully, given a Continue Request', async () => {
    // given
    const interactionID = "COPC_IN000001UK01";

    // when
    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    const parsedInteractionId = await parseInteractionId(exampleContinueRequest);

    // then
    expect(parsedInteractionId).toEqual(interactionID);
  });

  it('should parse the interaction ID successfully, given a Negative Acknowledgement', async () => {
    // given
    const interactionID = "MCCI_IN010000UK13";

    // when
    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    const parsedInteractionId = await parseInteractionId(exampleNegativeAcknowledgement);

    // then
    expect(parsedInteractionId).toEqual(interactionID);
  });

  it('should parse the conversation ID successfully, given a EHR Request', async () => {
    // given
    const conversationId = "95C5A27C-9DE3-4C3A-A6CA-D9CD437BC6CC";

    // when
    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    const parsedConversationId = await parseConversationId(exampleEhrRequest);

    // then
    expect(parsedConversationId).toEqual(conversationId);
  });

  it('should parse the conversation ID successfully, given a Continue Request', async () => {
    // given
    const conversationId = "DBC31D30-F984-11ED-A4C4-956AA80C6B4E";

    // when
    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    const parsedConversationId = await parseConversationId(exampleContinueRequest);

    // then
    expect(parsedConversationId).toEqual(conversationId);
  });

  it('should parse the conversation ID successfully, given a Negative Acknowledgement', async () => {
    // given
    const conversationId = "DBC31D30-F984-11ED-A4C4-956AA80C6B4E";

    // when
    validateFieldsHaveSuccessfullyParsed.mockReturnValueOnce(undefined);

    const parsedConversationId = await parseConversationId(exampleNegativeAcknowledgement);

    // then
    expect(parsedConversationId).toEqual(conversationId);
  });
});