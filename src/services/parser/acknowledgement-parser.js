import { XmlParser } from "./xml-parser/xml-parser";
import { INTERACTION_IDS } from "../../constants/interaction-ids";

export const parseCommonAcknowledgementFields = async message => {
  const messageParts = {
    ebXml: await new XmlParser().parse(JSON.parse(message).ebXML),
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const messageHeaderContent = messageParts.ebXml['data']['Envelope']['Header']['MessageHeader'];
  const payloadContent = messageParts.payload['data'][INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID];

  return {
    service: messageHeaderContent['Service'],
    messageId: messageHeaderContent['MessageData']['MessageId'],
    referencedMessageId: messageHeaderContent['MessageData']['RefToMessageId'] // Field does not always exist on ACK
      ? messageHeaderContent['MessageData']['RefToMessageId']
      : 'Unavailable',
    ackTypeCode: payloadContent['acknowledgement']['typeCode'],
    ackDetail: payloadContent['acknowledgement']['acknowledgementDetail']['code']['displayName']
  }
}

export const parseNegativeAcknowledgementFields = async message => {
  const messageParts = {
    ebXml: await new XmlParser().parse(JSON.parse(message).ebXML),
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const messageHeaderContent = messageParts.ebXml['data']['Envelope']['Header']['MessageHeader'];
  const payloadContent = messageParts.payload['data'][INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID];

  return {
    service: messageHeaderContent['Service'],
    messageId: messageHeaderContent['MessageData']['MessageId'],
    referencedMessageId: messageHeaderContent['MessageData']['RefToMessageId'],
    ackTypeCode: payloadContent['acknowledgement']['typeCode']
  }
}
