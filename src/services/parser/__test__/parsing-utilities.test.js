import path from "path";
import expect from "expect";
import { readFileSync } from "fs";
import { parseConversationId, parseInteractionId } from "../parsing-utilities";

describe('parsing-utilities.js', () => {
  // ============ COMMON PROPERTIES ============
  const exampleEhrRequest = readFileSync(path.join(__dirname, "data", "ehr-requests", "RCMR_IN010000UK05"), "utf-8");
  const exampleContinueRequest = readFileSync(path.join(__dirname, "data", "continue-requests", "COPC_IN000001UK01"), "utf-8");
  const exampleNegativeAcknowledgement = readFileSync(path.join(__dirname, "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_01"), "utf-8");
  // =================== END ===================

  it('given a ehr request, it should parse the interaction id and conversation id successfully', async () => {
    // given
    const conversationID = "95C5A27C-9DE3-4C3A-A6CA-D9CD437BC6CC";
    const interactionID = "RCMR_IN010000UK05";

    // when
    const parsedInteractionId = await parseInteractionId(exampleEhrRequest);
    const parsedConversationId = await parseConversationId(exampleEhrRequest);

    // then
    expect(parsedInteractionId).toEqual(interactionID);
    expect(parsedConversationId).toEqual(conversationID);
  });

  it('given a continue request, it should parse the interaction id and conversation id successfully', async () => {
    // given
    const conversationID = "DBC31D30-F984-11ED-A4C4-956AA80C6B4E";
    const interactionID = "COPC_IN000001UK01";

    // when
    const parsedInteractionId = await parseInteractionId(exampleContinueRequest);
    const parsedConversationId = await parseConversationId(exampleContinueRequest);

    // then
    expect(parsedInteractionId).toEqual(interactionID);
    expect(parsedConversationId).toEqual(conversationID);
  });

  it('given a negative acknowledgement from TPP, it should parse the interaction id and conversation id successfully', async () => {
    // given
    const conversationID = "DBC31D30-F984-11ED-A4C4-956AA80C6B4E";
    const interactionID = "MCCI_IN010000UK13";

    // when
    const parsedInteractionId = await parseInteractionId(exampleNegativeAcknowledgement);
    const parsedConversationId = await parseConversationId(exampleNegativeAcknowledgement);

    // then
    expect(parsedInteractionId).toEqual(interactionID);
    expect(parsedConversationId).toEqual(conversationID);
  });
});