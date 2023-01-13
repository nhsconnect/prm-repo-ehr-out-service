import { logError, logInfo, logWarning } from '../../middleware/logging';
import { extractEbXmlData } from './extract-eb-xml-data';
import { extractPayloadData } from './extract-payload-data';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { INTERACTION_IDS } from '../../constants/interaction-ids';

export const parse = async messageBody => {
  logInfo('Parsing message as EHR request');

  try {
    const { interactionId, conversationId } = await extractEbXmlData(JSON.parse(messageBody).ebXML);
    setCurrentSpanAttributes({ conversationId: conversationId });
    logInfo('Successfully parsed ebXML');

    let ehrRequestId = undefined,
      nhsNumber = undefined,
      odsCode = undefined;

    //we can take out this if statement
    if (interactionId === INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID) {
      let payloadData = await extractPayloadData(JSON.parse(messageBody).payload, interactionId);

      logInfo(`Payload data returned: ` + JSON.stringify(payloadData));

      ehrRequestId = payloadData.ehrRequestId;
      nhsNumber = payloadData.nhsNumber;
      odsCode = payloadData.odsCode;

      logInfo(`Successfully parsed payload`);
    } else {
      const warning = new Error('Invalid interaction ID: ' + interactionId); // TODO really invalid or just not the right type of message for this parser? Dan
      logWarning(warning.message);
      throw warning;
    }

    logInfo('Successfully parsed message as EHR request');

    return {
      interactionId,
      conversationId,
      ehrRequestId,
      nhsNumber,
      odsCode
    };
  } catch (e) {
    const errorWithContext = new Error('Error parsing message as EHR request: ' + e.message, {
      cause: e
    });
    logError(errorWithContext);
    throw errorWithContext;
  }
};
