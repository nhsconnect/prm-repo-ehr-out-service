import { INTERACTION_IDS } from "../../constants/interaction-ids";
import { XmlParser } from "./xml-parser/xml-parser";
import { validateFieldsHaveSuccessfullyParsed } from "./parsing-validation";
import { jsonParseMessage } from "./parsing-utilities";

export const parseAcknowledgementMessage = async message => {
  const messageParts = {
    ebXml: await new XmlParser().parse(jsonParseMessage(message).ebXML),
    payload: await new XmlParser().parse(jsonParseMessage(message).payload)
  }

  const messageHeaderContent = messageParts.ebXml?.['data']?.['Envelope']?.['Header']?.['MessageHeader'];
  const payloadContent = messageParts.payload?.['data']?.[INTERACTION_IDS.ACKNOWLEDGEMENT];

  const parsedFields = {
    service: messageHeaderContent?.['Service'],
    messageId: messageHeaderContent?.['MessageData']?.['MessageId'],
    referencedMessageId: messageHeaderContent?.['MessageData']?.['RefToMessageId']
        ? messageHeaderContent['MessageData']['RefToMessageId']
        : 'NOT FOUND',
    messageRef: payloadContent?.['acknowledgement']?.['messageRef']?.['id']?.['root']
        ? payloadContent['acknowledgement']['messageRef']['id']['root']
        : 'NOT FOUND',
    acknowledgementTypeCode: payloadContent?.['acknowledgement']?.['typeCode'],
    acknowledgementDetail: payloadContent?.['acknowledgement']?.['acknowledgementDetail']?.['code']?.['displayName']
        ? payloadContent['acknowledgement']['acknowledgementDetail']['code']['displayName']
        : 'NOT FOUND'
  };

  validateFieldsHaveSuccessfullyParsed(parsedFields);

  return parsedFields;
};

export const isIntegrationAcknowledgement = async message => {
  // Parse fields which identify it as being an integration acknowledgement.
  // Return true is it is, or false if it's not.
};