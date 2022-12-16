import { XmlParser } from './xml-parser/xml-parser';

export const extractPayloadData = async (payload, interactionId) => {
  const payloadParser = await new XmlParser().parse(payload);
  const ehrRequestId =
    payloadParser['data'][interactionId]['ControlActEvent']['subject']['EhrRequest']['id']['root'];
  const nhsNumber =
    payloadParser['data'][interactionId]['ControlActEvent']['subject']['EhrRequest'][
      'recordTarget'
    ]['patient']['id']['extension'];
  const odsCode =
    payloadParser['data'][interactionId]['ControlActEvent']['subject']['EhrRequest']['author'][
      'AgentOrgSDS'
    ]['agentOrganizationSDS']['id']['extension'];
  return [ehrRequestId, nhsNumber, odsCode];
};
