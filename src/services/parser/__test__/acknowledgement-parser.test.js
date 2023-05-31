import path from "path";
import expect from "expect";
import { readFileSync } from "fs";
import { parseCommonAcknowledgementFields } from "../acknowledgement-parser";
import { ACKNOWLEDGEMENT_TYPES } from "../../../constants/acknowledgement-types";
import { SERVICES } from "../../../constants/services";

describe('parseCommonAcknowledgementFields', () => {
  it('given a negative acknowledgement from TPP, it should parse successfully', async () => {
    // given
    const acknowledgementMessageId = "BB8FC948-FA40-11ED-A594-F40343488B16";
    const referencedMessageId = "608368A0-DEC0-496B-9C4F-47CA90B81B58";
    const acknowledgementDetail = "hl7:{interactionId}/hl7:communicationFunctionRcv/hl7:device/hl7:id/@extension is missing, empty, invalid or ACL violation";
    const exampleAcknowledgement = readFileSync(path.join(__dirname, "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_01"), "utf-8");

    // when
    const parsedMessage = await parseCommonAcknowledgementFields(exampleAcknowledgement);

    // then
    expect(parsedMessage.messageId).toEqual(acknowledgementMessageId);
    expect(parsedMessage.referencedMessageId).toEqual(referencedMessageId);
    expect(parsedMessage.acknowledgementDetail).toEqual(acknowledgementDetail);
    expect(SERVICES.gp2gp).toEqual(parsedMessage.service);
    expect(ACKNOWLEDGEMENT_TYPES.NEGATIVE).toContain(parsedMessage.acknowledgementTypeCode);
  });

  it('given a negative acknowledgement from TPP with no referencedMessageId, it should parse successfully', async () => {
    // given
    const acknowledgementMessageId = "7E6C9590-FA4B-11ED-808B-AC162D1F16F0";
    const referencedMessageId = "UNAVAILABLE";
    const acknowledgementDetail = "Large Message general failure";
    const exampleAcknowledgement = readFileSync(path.join(__dirname, "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_02"), "utf-8");

    // when
    const parsedMessage = await parseCommonAcknowledgementFields(exampleAcknowledgement);

    // then
    expect(parsedMessage.messageId).toEqual(acknowledgementMessageId);
    expect(parsedMessage.referencedMessageId).toEqual(referencedMessageId);
    expect(parsedMessage.acknowledgementDetail).toEqual(acknowledgementDetail);
    expect(ACKNOWLEDGEMENT_TYPES.NEGATIVE).toContain(parsedMessage.acknowledgementTypeCode);
    expect(SERVICES.gp2gp).toEqual(parsedMessage.service);
  });
});