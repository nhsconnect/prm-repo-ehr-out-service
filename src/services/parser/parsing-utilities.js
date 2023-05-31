import { XmlParser } from "./xml-parser/xml-parser";
import { ParsingError } from "../../errors/errors";

export const parseInteractionId = async message => {
  try {
    const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);
    return ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['Action'];
  } catch (error) {
    throw new ParsingError(error);
  }
};

export const parseConversationId = async message => {
  try {
    const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);
    return ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['ConversationId'];
  } catch (error) {
    throw new ParsingError(error);
  }
};
