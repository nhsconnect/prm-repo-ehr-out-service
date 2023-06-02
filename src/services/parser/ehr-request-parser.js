import {INTERACTION_IDS} from "../../constants/interaction-ids";
import { XmlParser } from "./xml-parser/xml-parser";
import { validateFieldsHaveSuccessfullyParsed } from "./parsing-validation";

export const parseEhrRequestMessage = async message => {
  const messageParts = {
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  };

  const ehrRequestContent = messageParts.payload['data'][INTERACTION_IDS.EHR_REQUEST]['ControlActEvent']['subject']['EhrRequest'];

  const parsedFields = {
    ehrRequestId: ehrRequestContent?.['id']?.['root'],
    nhsNumber: ehrRequestContent?.['recordTarget']?.['patient']?.['id']?.['extension'],
    odsCode: ehrRequestContent?.['author']?.['AgentOrgSDS']?.['agentOrganizationSDS']?.['id']?.['extension']
  };

  validateFieldsHaveSuccessfullyParsed(parsedFields);

  return parsedFields;
};