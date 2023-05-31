import { INTERACTION_IDS } from "../../constants/interaction-ids";
import { XmlParser } from "./xml-parser/xml-parser";
import { ParsingError } from "../../errors/errors";

export const parseContinueRequestMessage = async message => {
  try {
    const messageParts = {
      payload: await new XmlParser().parse(JSON.parse(message).payload)
    }

    const continueRequestContent = messageParts.payload['data'][INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID]['ControlActEvent']['subject']['PayloadInformation'];

    return {
      odsCode: continueRequestContent['value']['Gp2gpfragment']['From']
    }
  } catch (error) {
    throw new ParsingError(error);
  }
};
