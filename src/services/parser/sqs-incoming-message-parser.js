import { XmlParser } from './xml-parser/xml-parser';
import { logError, logInfo } from '../../middleware/logging';

export const parse = async messageBody => {
  logInfo('Parsing ehr-out-service-incoming event');

  try {
    const { interactionId, conversationId } = await extractEbXmlData(JSON.parse(messageBody).ebXML);
    // determine request type by interaction id
    // parse the payload

    return {
      interactionId: interactionId,
      conversationId: conversationId
    };
  } catch (e) {
    logError('Error parsing ehr-out-service-incoming queue event', e);
  }
};

const extractEbXmlData = async ebXml => {
  const ebXmlParser = await new XmlParser().parse(ebXml);
  const interactionId = ebXmlParser['data']['Envelope']['Header']['MessageHeader']['Action'];
  const conversationId =
    ebXmlParser['data']['Envelope']['Header']['MessageHeader']['ConversationId'];
  return {
    interactionId,
    conversationId
  };
};
