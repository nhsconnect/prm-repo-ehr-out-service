import { validateFieldsHaveSuccessfullyParsed } from "./parsing-validation";
import { INTERACTION_IDS } from "../../constants/interaction-ids";
import { jsonParseMessage } from "./parsing-utilities";
import { XmlParser } from "./xml-parser/xml-parser";

export const parseContinueRequestMessage = async message => {
  const messageParts = {
    payload: await new XmlParser().parse(jsonParseMessage(message).payload)
  }

  const continueRequestContent = messageParts.payload?.['data']?.[INTERACTION_IDS.CONTINUE_REQUEST]?.['ControlActEvent']?.['subject']?.['PayloadInformation'];

  const parsedFields = {
    odsCode: continueRequestContent?.['value']?.['Gp2gpfragment']?.['From']
  };

  validateFieldsHaveSuccessfullyParsed(parsedFields);

  return parsedFields;
};