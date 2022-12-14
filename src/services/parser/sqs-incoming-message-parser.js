import { XmlParser } from './xml-parser/xml-parser';
import { logInfo } from '../../middleware/logging';

export const parse = async messageBody => {
  logInfo('Trying to parse ehr-out-service-incoming event');
  try {
    let ebXmlParser = await getEbXmlParser(messageBody.ebXML);
    const interactionId = ebXmlParser['data']['Envelope']['Header']['MessageHeader']['Action'];
    // const test = ebXmlParser.findFirst('envelope/header/action');

    // determine request type by interaction id
    // parse the payload

    return {
      interactionId: interactionId
    };
  } catch (e) {
    // ToDo Handle errors
  }
};

const getEbXmlParser = async ebXml => {
  return await new XmlParser().parse(ebXml);
};
