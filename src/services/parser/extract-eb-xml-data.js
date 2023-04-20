import { XmlParser } from './xml-parser/xml-parser';
import { logInfo } from '../../middleware/logging';
import {ParseMessageError} from "../../errors/errors";

export const extractEbXmlData = async ebXml => {
  try {
    const ebXmlAsJson = await new XmlParser().parse(ebXml);

    logInfo('parsed ebxml to object');

    let header = ebXmlAsJson['data']['Envelope']['Header'];

    const interactionId = header['MessageHeader']['Action'];
    const conversationId = header['MessageHeader']['ConversationId'];
    const messageId = header['MessageHeader']['MessageData']['MessageId'];

    return {
      interactionId,
      conversationId,
      messageId,
    };
  } catch (error) {
    throw new ParseMessageError(error);
  }
};

export const extractReferencedFragmentMessageIds = async ebXml => {
  let reference;

  try {
    const ebXmlAsJson = await new XmlParser().parse(ebXml);

    const body = ebXmlAsJson['data']['Envelope']['Body'];
    reference = body['Manifest']['Reference'];
  } catch (error) {
    throw new ParseMessageError(error);
  }

  // Ensure we got an array before continue, as parser might yield the field 'Reference'
  // as an array or single object, depends on how many references in input file.
  const referencesList = Array.isArray(reference) ? reference : [reference];

  const fragmentReferences = referencesList.filter(reference => reference?.href.startsWith('mid:'));

  return fragmentReferences.map(reference => reference.href.replace('mid:', ''));
};
