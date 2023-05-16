import { logError, logInfo, logWarning } from '../../middleware/logging';
import { extractEbXmlData } from './extract-eb-xml-data';
import { extractEhrRequestPayloadData } from './extract-ehr-request-payload-data';
import { extractContinueRequestPayloadData } from "./extract-continue-request-payload-data";
import { setCurrentSpanAttributes } from '../../config/tracing';
import { INTERACTION_IDS } from '../../constants/interaction-ids';

export const parse = async messageBody => {
  const { interactionId, conversationId } = await getEbXMLData(messageBody);

  setCurrentSpanAttributes({ conversationId });
  logInfo('Successfully parsed ebXML');

  let ehrRequestId, nhsNumber, odsCode, payloadData;

  switch (interactionId) {
    case INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID:
      payloadData = await getEhrRequestPayloadData(messageBody, interactionId);
      logInfo(`Received for ${interactionId}, payload data returned: ${JSON.stringify(payloadData)}`);
      ehrRequestId = payloadData.ehrRequestId;
      nhsNumber = payloadData.nhsNumber;
      odsCode = payloadData.odsCode;
      logInfo('Successfully parsed payload');
      validatePayloadData(interactionId, conversationId, ehrRequestId, nhsNumber, odsCode);
      break;
    case INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID:
      payloadData = await getContinueRequestPayloadData(messageBody);
      logInfo(`Received for ${interactionId}, payload data returned: ${JSON.stringify(payloadData)}`);
      odsCode = payloadData.odsCode;
      logInfo('Successfully parsed payload');
      validatePayloadData(interactionId, conversationId, odsCode);
      break;
    case INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID:
      // TODO: Implement the handling of acknowledgement in future
      break;
    default:
      const warning = new Error(`Invalid interaction ID: ${interactionId}`);
      logWarning(warning.message);
      throw warning;
  }

  return { interactionId, conversationId, ehrRequestId, nhsNumber, odsCode };
};

const getEbXMLData = async messageBody => {
  try {
    return await extractEbXmlData(JSON.parse(messageBody).ebXML);
  }
  catch (error) {
    handleParsingError(error);
  }
};

const getEhrRequestPayloadData = async (messageBody, interactionId) => {
  try {
    return await extractEhrRequestPayloadData(JSON.parse(messageBody).payload, interactionId);
  } catch (error) {
    handleParsingError(error);
  }
}


const getContinueRequestPayloadData = async (messageBody) => {
  try {
    return await extractContinueRequestPayloadData(JSON.parse(messageBody).payload);
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