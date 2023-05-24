import { XmlParser } from "./xml-parser/xml-parser";
import { INTERACTION_IDS } from "../../constants/interaction-ids";

export const parseContinueRequestMessage = async message => {
  const messageParts = {
    payload: await new XmlParser().parse(JSON.parse(message).payload)
  }

  const continueRequestContent = messageParts.payload['data'][INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID]['ControlActEvent']['subject']['PayloadInformation'];

  return {
    odsCode: continueRequestContent['value']['Gp2gpfragment']['From']
  }
};