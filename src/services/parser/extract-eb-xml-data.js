import { XmlParser } from './xml-parser/xml-parser';
import { logInfo } from '../../middleware/logging';

export const extractEbXmlData = async ebXml => {
  const ebxmlAsJson = await new XmlParser().parse(ebXml);

  logInfo('parsed ebxml to object');

  let header = ebxmlAsJson['data']['Envelope']['Header'];

  const interactionId = header['MessageHeader']['Action'];
  const conversationId = header['MessageHeader']['ConversationId'];

  return {
    interactionId,
    conversationId
  };
};
