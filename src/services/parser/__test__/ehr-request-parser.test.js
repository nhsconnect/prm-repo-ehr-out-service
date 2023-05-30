import path from "path";
import expect from "expect";
import { readFileSync } from "fs";
import { parseEhrRequestMessage } from "../ehr-request-parser";
import { parseConversationId, parseInteractionId } from "../parsing-utilities";

describe('ehr-request-parser.js', () => {
  it('given an ehr request, it should parse successfully', async () => {
    // given
    const interactionId = "RCMR_IN010000UK05";
    const conversationId = "95C5A27C-9DE3-4C3A-A6CA-D9CD437BC6CC";
    const ehrRequestId = "FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA";
    const nhsNumber = "9692842304";
    const odsCode = "A91720";
    const exampleEhrRequest = readFileSync(path.join(__dirname, "data", "ehr-requests", "RCMR_IN010000UK05"), "utf-8");

    // when
    const parsedInteractionId = await parseInteractionId(exampleEhrRequest);
    const parsedConversationId = await parseConversationId(exampleEhrRequest);
    const parsedMessage = await parseEhrRequestMessage(exampleEhrRequest);

    // then
    expect(parsedInteractionId).toEqual(interactionId);
    expect(parsedConversationId).toEqual(conversationId);
    expect(parsedMessage.ehrRequestId).toEqual(ehrRequestId);
    expect(parsedMessage.nhsNumber).toEqual(nhsNumber);
    expect(parsedMessage.odsCode).toEqual(odsCode);
  });
});