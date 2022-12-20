import { logError, logInfo, logWarning } from '../../middleware/logging';
import { extractEbXmlData } from './extract-eb-xml-data';
import { extractPayloadData } from './extract-payload-data';
import { INTERACTION_IDS } from '../../constants/interaction-ids';

export const parse = async messageBody => {
  logInfo('Parsing ehr-out-service-incoming event');

  try {
    const { interactionId, conversationId } = await extractEbXmlData(JSON.parse(messageBody).ebXML);
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
      logWarning('Invalid interaction id ' + interactionId);
      // hang on a minute, it's not even correct interaction id -> fallthrough! BUG
    }

    logInfo('Successfully parsed ehr-out-service-incoming event');

    return {
      interactionId,
      conversationId,
      ehrRequestId,
      nhsNumber,
      odsCode
    };
  } catch (e) {
    logError('Error parsing ehr-out-service-incoming queue event: ' + e, e);
  }
};
