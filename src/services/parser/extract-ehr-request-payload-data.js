import { XmlParser } from './xml-parser/xml-parser';
import { logInfo } from '../../middleware/logging';

export const extractEhrRequestPayloadData = async (payload, interactionId) => {
  const payloadAsObject = await new XmlParser().parse(payload);
  logInfo('parsed payload to object');

  let ehrRequestContent =
    payloadAsObject.data[interactionId]['ControlActEvent']['subject']['EhrRequest'];

  const ehrRequestId = ehrRequestContent['id']['root'];

  const nhsNumber = ehrRequestContent['recordTarget']['patient']['id']['extension'];

  const odsCode =
    ehrRequestContent['author']['AgentOrgSDS']['agentOrganizationSDS']['id']['extension'];

  return { ehrRequestId, nhsNumber, odsCode };
};
