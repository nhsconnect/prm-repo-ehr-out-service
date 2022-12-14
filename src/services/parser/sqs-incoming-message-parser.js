import { XmlParser } from './xml-parser/xml-parser';
import { logInfo } from '../../middleware/logging';

export const parse = async messageBody => {
  logInfo('Trying to parse ehr-out-service-incoming event');

  try {
    const { interactionId, conversationId } = await extractEbXmlData(messageBody.ebXML);

    // determine request type by interaction id
    // parse the payload

    return {
      interactionId: interactionId,
      conversationId: conversationId
    };
  } catch (e) {
    // ToDo Handle errors
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
