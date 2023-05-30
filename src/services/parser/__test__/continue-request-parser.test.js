import path from "path";
import expect from "expect";
import { readFileSync } from "fs";
import { parseContinueRequestMessage } from "../continue-request-parser";
import { parseConversationId, parseInteractionId } from "../parsing-utilities";

describe('ehr-request-parser.js', () => {
  it('given a continue request, it should parse successfully', async () => {
    // given
    const interactionId = "COPC_IN000001UK01";
    const conversationId = "DBC31D30-F984-11ED-A4C4-956AA80C6B4E";
    const odsCode = "M85019";
    const exampleContinueRequest = readFileSync(path.join(__dirname, "data", "continue-requests", "COPC_IN000001UK01"), "utf-8");

    // when
    const parsedConversationId = await parseConversationId(exampleContinueRequest);
    const parsedInteractionId = await parseInteractionId(exampleContinueRequest);
    const parsedMessage = await parseContinueRequestMessage(exampleContinueRequest);

    // then
    expect(parsedInteractionId).toEqual(interactionId);
    expect(parsedConversationId).toEqual(conversationId);
    expect(parsedMessage.odsCode).toEqual(odsCode);
  });
});