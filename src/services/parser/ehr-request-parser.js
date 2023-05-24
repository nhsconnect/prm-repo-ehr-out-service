import { XmlParser } from "./xml-parser/xml-parser";
import { INTERACTION_IDS } from "../../constants/interaction-ids";

export const parseEhrRequestMessage = async message => {
  const messageParts = {
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const ehrRequestContent = messageParts.payload['data'][INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID]['ControlActEvent']['subject']['EhrRequest'];

  return {
    ehrRequestId: ehrRequestContent['id']['root'],
    nhsNumber: ehrRequestContent['recordTarget']['patient']['id']['extension'],
    odsCode: ehrRequestContent['author']['AgentOrgSDS']['agentOrganizationSDS']['id']['extension']
  }
};