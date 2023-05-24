import { XmlParser } from "./xml-parser/xml-parser";

/**
 * Attributes which are common across Interaction IDs.
 * @param message The message to be parsed.
 * @returns {Promise<{interactionId: string, conversationId: *}>}
 */
export const parseCommonMessageAttributes = async message => {
  return {
    interactionId: await parseInteractionId(message),
    conversationId: await parseConversationId(message)
  };
};

export const parseInteractionId = async message => {
  const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);
  return ebxmlAsJson['data']['Envelope']['Header']['MessageHeader']['Action'];
};

export const parseConversationId = async message => {
  const ebxmlAsJson = await new XmlParser().parse(JSON.parse(message).ebXML);
  return ebxmlAsJson['data']['Envelope']['Header']['ConversationId'];
};