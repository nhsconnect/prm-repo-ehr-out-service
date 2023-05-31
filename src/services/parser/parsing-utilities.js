import { XmlParser } from "./xml-parser/xml-parser";
import { ParsingError } from "../../errors/errors";

export const parseInteractionId = async message => {
  const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);

  const parsedFields = {
    interactionId: ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['Action']
  };

  validateFieldsHaveSuccessfullyParsed(parsedFields);

  return parsedFields.interactionId;
};

export const parseConversationId = async message => {
  const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);

  const parsedFields = {
    conversationId: ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['ConversationId']
  };

  validateFieldsHaveSuccessfullyParsed(parsedFields);

  return parsedFields.conversationId;
};

export const validateFieldsHaveSuccessfullyParsed = parsedFields => {
  const undefinedFields = Object.entries(parsedFields).map(([key, value]) => {
    if (value === undefined) {
      return key;
    }
  });

  if (undefinedFields.length > 0) {
    throw new ParsingError(`The following fields have parsed as undefined: ${undefinedFields}`);
  }
};