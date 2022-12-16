import { XmlParser } from './xml-parser/xml-parser';

export const extractEbXmlData = async ebXml => {
  const ebXmlParser = await new XmlParser().parse(ebXml);
  const interactionId = ebXmlParser['data']['Envelope']['Header']['MessageHeader']['Action'];
  const conversationId =
    ebXmlParser['data']['Envelope']['Header']['MessageHeader']['ConversationId'];
  return {
    interactionId,
    conversationId
  };
};
