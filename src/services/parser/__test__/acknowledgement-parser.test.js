import { parseCommonAcknowledgementFields } from "../acknowledgement-parser";
import { readFileSync } from "fs";
import expect from "expect";
import path from "path";

describe('parseCommonAcknowledgementFields', () => {
  // ============ COMMON PROPERTIES ============
  const ACKNOWLEDGEMENT_TYPES = {
    POSITIVE: ['AA'],
    NEGATIVE: ['AE', 'AR']
  };
  const SERVICES = [
    'urn:nhs:names:services:gp2gp'
  ];
  // =================== END ===================

  /**
   * TODO [PRMT-2729] retrieve
   *  A positive acknowledgement with type code AA from EMIS
   *  A positive acknowledgement with type code AA from TPP
   *  A negative acknowledgement with type code AE from EMIS when we're able to test EMIS FSS
   *  A negative acknowledgement with type code AR from EMIS when we're able to test EMIS FSS
   *  A negative acknowledgement with type code AR from TPP when we're able to test TPP FSS
   */

  //
  // it('given a negative acknowledgement from EMIS, it should parse successfully', async () => {});
  // it('given a negative acknowledgement from EMIS, it should parse successfully', async () => {});

  it('given a negative acknowledgement from TPP, it should parse successfully', async () => {
    // given
    const acknowledgementMessageId = "BB8FC948-FA40-11ED-A594-F40343488B16";
    const referencedMessageId = "608368A0-DEC0-496B-9C4F-47CA90B81B58";
    const acknowledgementDetail = "hl7:{interactionId}/hl7:communicationFunctionRcv/hl7:device/hl7:id/@extension is missing, empty, invalid or ACL violation";
    const exampleAcknowledgement = readFileSync(path.join(__dirname, "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_01"), "utf-8");

    // when
    const parsedMessage = await parseCommonAcknowledgementFields(exampleAcknowledgement);

    // then
    expect(ACKNOWLEDGEMENT_TYPES.NEGATIVE).toContain(parsedMessage.ackTypeCode);
    expect(SERVICES).toContain(parsedMessage.service);
    expect(parsedMessage.referencedMessageId).toEqual(referencedMessageId);
    expect(parsedMessage.messageId).toEqual(acknowledgementMessageId);
  });

  it('given a negative acknowledgement from TPP with no referencedMessageId, it should parse successfully', async () => {
    // given
    const acknowledgementMessageId = "7E6C9590-FA4B-11ED-808B-AC162D1F16F0";
    const referencedMessageId = "Unavailable";
    const acknowledgementDetail = "Large Message general failure";
    const exampleAcknowledgement = readFileSync(path.join(__dirname, "data", "acknowledgements", "negative", "MCCI_IN010000UK13_TPP_AR_02"), "utf-8");

    // when
    const parsedMessage = await parseCommonAcknowledgementFields(exampleAcknowledgement);

    // then
    expect(ACKNOWLEDGEMENT_TYPES.NEGATIVE).toContain(parsedMessage.ackTypeCode);
    expect(SERVICES).toContain(parsedMessage.service);
    expect(parsedMessage.referencedMessageId).toEqual(referencedMessageId);
    expect(parsedMessage.messageId).toEqual(acknowledgementMessageId);
  });
});