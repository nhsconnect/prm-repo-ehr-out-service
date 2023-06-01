import {XmlParser} from "./xml-parser/xml-parser";
import { validateFieldsHaveSuccessfullyParsed } from "./parsing-validation";

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