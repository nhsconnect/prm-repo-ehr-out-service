import { logError, logInfo } from '../../middleware/logging';
import { extractEbXmlData } from './extract-eb-xml-data';
import { extractPayloadData } from './extract-payload-data';

export const parse = async messageBody => {
  logInfo('Parsing ehr-out-service-incoming event');

  try {
    const { interactionId, conversationId } = await extractEbXmlData(JSON.parse(messageBody).ebXML);
    logInfo('Successfully parsed ebXML');

    const { ehrRequestId, nhsNumber, odsCode } = await extractPayloadData(
      JSON.parse(messageBody).payload,
      interactionId
    );
    logInfo(`Successfully parsed payload`);
    logInfo('Successfully parsed ehr-out-service-incoming event');

    return {
      interactionId,
      conversationId,
      ehrRequestId,
      nhsNumber,
      odsCode
    };
  } catch (e) {
    logError('Error parsing ehr-out-service-incoming queue event', e);
  }
};
