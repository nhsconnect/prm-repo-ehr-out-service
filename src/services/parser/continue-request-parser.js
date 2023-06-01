import { INTERACTION_IDS } from "../../constants/interaction-ids";
import { XmlParser } from "./xml-parser/xml-parser";
import { validateFieldsHaveSuccessfullyParsed } from "./parsing-validation";

export const parseContinueRequestMessage = async message => {
  const messageParts = {
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const continueRequestContent = messageParts.payload['data'][INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID]['ControlActEvent']['subject']['PayloadInformation'];

  const parsedFields = {
    odsCode: continueRequestContent['value']['Gp2gpfragment']['From']
  };

  validateFieldsHaveSuccessfullyParsed(parsedFields);

  return parsedFields;
};