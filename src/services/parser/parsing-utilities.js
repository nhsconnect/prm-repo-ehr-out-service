import { XmlParser } from "./xml-parser/xml-parser";

export const parseInteractionId = async message => {
  const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);
  return ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['Action'];
};

export const parseConversationId = async message => {
  const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);
  return ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['ConversationId'];
};