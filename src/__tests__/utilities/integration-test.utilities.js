import { FileReadError } from '../../errors/errors';
import { XMLParser } from 'fast-xml-parser';
import isEqual from 'lodash.isequal';
import { readFileSync } from 'fs';
import * as path from 'path';

const parser = new XMLParser({
  ignoreAttributes : false
});

export const readFile = (fileName, ...folderNames) => {
  try {
    return readFileSync(path.join(__dirname, "..", "data", ...folderNames, fileName), "utf-8");
  } catch (error) {
    throw new FileReadError(error);
  }
};

export const validateMessageEquality = (original, modified) => {
  const conditions = [
    validateEbXmlEquality(original, modified),
    validatePayloadEquality(original, modified)
  ];

  return conditions.every(test => test === true);
};

const validateEbXmlEquality = (original, modified) => {
  const ebXMLs = {
    original: parser.parse(JSON.parse(original).ebXML),
    modified: parser.parse(JSON.parse(modified).ebXML)
  };

  for (const key in ebXMLs) {
    if (ebXMLs.hasOwnProperty(key)) {
      delete ebXMLs[key]["soap:Envelope"]["soap:Header"]["eb:MessageHeader"]["eb:MessageData"]["eb:MessageId"];
    }
  }

  // TODO: Figure out a way to delete the xlink href Message IDs for each occurrence in the ebXML manifest
  // TODO: and then this should be good to go.

  return isEqual(ebXMLs.original, ebXMLs.modified);
}

const validatePayloadEquality = (original, modified) => {
  const payloads = {
    original: parser.parse(JSON.parse(original).payload),
    modified: parser.parse(JSON.parse(modified).payload)
  };

  for (const key in payloads) {
    if (payloads.hasOwnProperty(key)) {
      delete payloads[key]['RCMR_IN030000UK06']['id']['@_root'];
      delete payloads[key]['RCMR_IN030000UK06']['ControlActEvent']['subject']['EhrExtract']['id']['@_root'];
    }
  }

  // TODO: Differentiate between the UK06 and COPC, identify places where we
  // TODO: expect changes to happen in those. Based on the interaction ID coming
  // TODO: in, we want to extract different parts.

  return isEqual(payloads.original, payloads.modified);
};

const validateAttachmentEquality = (original, modified) => {
  const attachments = {
    original: parser.parse(JSON.parse(original).attachments),
    modified: parser.parse(JSON.parse(modified).attachments)
  };

  return true;
};

const validateExternalAttachmentEquality = (original, modified) => {
  const externalAttachments = {
    original: parser.parse(JSON.parse(original).attachments),
    modified: parser.parse(JSON.parse(modified).attachments)
  };

  return true;
}