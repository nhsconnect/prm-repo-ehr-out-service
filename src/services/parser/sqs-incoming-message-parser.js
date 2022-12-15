import { XmlParser } from './xml-parser/xml-parser';
import { logError, logInfo } from '../../middleware/logging';

export const parse = async messageBody => {
  logInfo('Parsing ehr-out-service-incoming event');

  try {
    const { interactionId, conversationId } = await extractEbXmlData(JSON.parse(messageBody).ebXML);
    logInfo('Successfully parsed ebXML');

    const { ehrRequestId, nhsNumber, odsCode } = await extractPayloadData(
      JSON.parse(messageBody).payload
    );
    // determine request type by interaction id
    logInfo(`Successfully parsed payload`);
    logInfo('Successfully parsed ehr-out-service-incoming event');

    return {
      interactionId: interactionId,
      conversationId: conversationId,
      ehrRequestId: ehrRequestId,
      nhsNumber: nhsNumber,
      odsCode: odsCode
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

//TODO need to verify the RCMR tag

const extractPayloadData = async payload => {
  const payloadParser = await new XmlParser().parse(payload);
  const ehrRequestId =
    payloadParser['data']['RCMR_IN010000UK05']['ControlActEvent']['subject']['EhrRequest']['id'][
      'root'
    ];
  const nhsNumber =
    payloadParser['data']['RCMR_IN010000UK05']['ControlActEvent']['subject']['EhrRequest'][
      'recordTarget'
    ]['patient']['id']['extension'];
  const odsCode =
    payloadParser['data']['RCMR_IN010000UK05']['ControlActEvent']['subject']['EhrRequest'][
      'author'
    ]['AgentOrgSDS']['agentOrganizationSDS']['id']['extension'];
  return { ehrRequestId, nhsNumber, odsCode };
};
