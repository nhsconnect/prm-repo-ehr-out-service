import { XmlParser } from "./xml-parser/xml-parser";

export const parseAcknowledgementMessage = async message => {
  const messageParts = {
    ebXml: await new XmlParser().parse(JSON.parse(message).ebXML),
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const messageHeaderContent = messageParts.ebXml['data']['Envelope']['Header']['MessageHeader'];

  return {
    service: messageHeaderContent['Service'],
    messageId: messageHeaderContent['MessageData']['MessageId'],
  }
};