import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes : false,
  removeNSPrefix: true,
  ignoreDeclaration: true
});

const ACKNOWLEDGEMENT_TYPES = {
  POSITIVE_ACKNOWLEDGEMENT: 0,
  NEGATIVE_ACKNOWLEDGEMENT: 1,
  INTEGRATION_ACKNOWLEDGEMENT: 2
};

export const acknowledgementMessageHandler = message => {
  switch (differentiateAcknowledgementType(message)) {
    case ACKNOWLEDGEMENT_TYPES.POSITIVE_ACKNOWLEDGEMENT:
      // DO LOGIC HERE TO HANDLE POSITIVE ACKNOWLEDGEMENTS.
      break;
    case ACKNOWLEDGEMENT_TYPES.NEGATIVE_ACKNOWLEDGEMENT:
      // DO LOGIC HERE TO HANDLE NEGATIVE ACKNOWLEDGEMENTS.
      break;
    case ACKNOWLEDGEMENT_TYPES.INTEGRATION_ACKNOWLEDGEMENT:
      // DO LOGIC HERE TO HANDLE INTEGRATION ACKNOWLEDGEMENTS.
      break;
    default:
      // HANDLE ANY ERRORS.
      break
  }
}

const differentiateAcknowledgementType = message => {
  const messageComponents = {
    ebXML: parser.parse(JSON.parse(message).ebXML),
    payload: parser.parse(JSON.parse(message).payload)
  };

  /**
   * DRILL INTO THE ebXML AND LOOK FOR:
   * - CONVERSATION ID
   * - SERVICE urn:nhs:names:services:pds OR urn:nhs:names:services:gp2gp
   *
   */

  /**
   * DRILL INTO PAYLOAD AND LOOK FOR:
   * <hl7:acknowledgement typeCode="AE"> <--- ACKNOWLEDGEMENT TYPE
   *  <hl7:messageRef>
   *    <hl7:id root="13962cb7-6d46-4986-bdb4-3201bb25f1f7"/> <---
   *  </hl7:messageRef>
   * </hl7:acknowledgement>
   *
   *
   *
   */

  // DO SOME COMPARISONS ON WHAT DIFFERENTIATES THE ACKS AND RETURN THE
  // CORRESPONDING ACK (I.E. ACKNOWLEDGEMENT_TYPES).

  return 0;
}