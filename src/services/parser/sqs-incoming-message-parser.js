import { logError, logInfo, logWarning } from '../../middleware/logging';
import { extractEbXmlData } from './extract-eb-xml-data';
import { extractPayloadData } from './extract-payload-data';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { INTERACTION_IDS } from '../../constants/interaction-ids';

export const parse = async messageBody => {
  const { interactionId, conversationId } = await getEbXMLPayloadData(messageBody);

  setCurrentSpanAttributes({ conversationId });
  logInfo('Successfully parsed ebXML');

  let ehrRequestId, nhsNumber, odsCode, payloadData;

  // Check the interaction ID and handle logic accordingly.
  switch (interactionId)
  {
    case INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID:
      payloadData = await getPayloadData(messageBody, interactionId);
      logInfo(`Received for ${interactionId}, payload data returned: ${JSON.stringify(payloadData)}`);

      ehrRequestId = payloadData.ehrRequestId;
      nhsNumber = payloadData.nhsNumber;
      odsCode = payloadData.odsCode;

      logInfo('Successfully parsed payload');
      break;
    case INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID:
      payloadData = await getPayloadData(messageBody, interactionId);
      logInfo(`Received for ${interactionId}, payload data returned: ${JSON.stringify(payloadData)}`);


      break;
    case INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID:
      payloadData = await getPayloadData();


      break;
    default:
      const warning = new Error(`Invalid interaction ID: ${interactionId}`);
      logWarning(warning.message);
      throw warning;
  }

  validatePayloadData(interactionId, conversationId, ehrRequestId, nhsNumber, odsCode);
  return {interactionId, conversationId, ehrRequestId, nhsNumber, odsCode };
};

const getEbXMLPayloadData = async messageBody => {
  try {
    return await extractEbXmlData(JSON.parse(messageBody).ebXML);
  }
  catch (error) {
    handleParsingError(error);
  }
};

const getPayloadData = async (messageBody, interactionId) => {
  try {
    return await extractPayloadData(JSON.parse(messageBody).payload, interactionId);
  } catch (error) {
    handleParsingError(error);
  }
}

const handleParsingError = error => {
  logError(error.message);
  throw new Error(`Error parsing message: ${error.message}`);
};

const validatePayloadData = (...fields) => {
  fields.forEach(field => {
    if(!field) {
      logError(`Validation failed for field ${field}`);
      throw new Error();
    }
  });
};