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

  return isEqual(ebXMLs.original, ebXMLs.modified);
}

const validatePayloadEquality = (original, modified) => {
  const payloads = {
    original: parser.parse(JSON.parse(original).payload),
    modified: parser.parse(JSON.parse(modified).payload)
  };

  // Removes references to message id in RCMR_IN030000UK06 -> ID Root and EHR Extract -> ID Root
  for (const key in payloads) {
    if (payloads.hasOwnProperty(key)) {
      delete payloads[key]['RCMR_IN030000UK06']['id']['@_root'];
      delete payloads[key]['RCMR_IN030000UK06']['ControlActEvent']['subject']['EhrExtract']['id']['@_root'];
    }
  }

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