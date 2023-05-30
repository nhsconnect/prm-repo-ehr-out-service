import { XmlParser } from "./xml-parser/xml-parser";
import { INTERACTION_IDS } from "../../constants/interaction-ids";

export const parseCommonAcknowledgementFields = async message => {
  const messageParts = {
    ebXml: await new XmlParser().parse(JSON.parse(message).ebXML),
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const messageHeaderContent = messageParts.ebXml['data']['Envelope']['Header']['MessageHeader'];

  return {
    service: messageHeaderContent['Service'],
    messageId: messageHeaderContent['MessageData']['MessageId'],
    referencedMessageId: messageHeaderContent['MessageData']['RefToMessageId'] // Field does not always exist on ACK
      ? messageHeaderContent['MessageData']['RefToMessageId']
      : 'Unavailable',
    ackTypeCode: messageParts.payload['data'][INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID]['acknowledgement']['typeCode'],
    ackDetail: messageParts.payload['data'][INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID]['acknowledgement']['acknowledgementDetail']['code']['displayName']
  }
}

// failureReason

export const parseNegativeAcknowledgementFields = async message => {
  const messageParts = {
    ebXml: await new XmlParser().parse(JSON.parse(message).ebXML),
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const messageHeaderContent = messageParts.ebXml['data']['Envelope']['Header']['MessageHeader'];

  return {
    service: messageHeaderContent['Service'],
    messageId: messageHeaderContent['MessageData']['MessageId'],
    referencedMessageId: messageHeaderContent['MessageData']['RefToMessageId'],
    ackTypeCode: messageParts.payload['data'][INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID]['acknowledgement']['typeCode']
  }
}
