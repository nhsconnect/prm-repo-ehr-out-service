import { FileReadError } from '../../errors/errors';
import { XMLParser } from 'fast-xml-parser';
import isEqual from 'lodash.isequal';
import { readFileSync } from 'fs';
import * as path from 'path';

const INTERACTION_IDS = {
  'UK06': 'RCMR_IN030000UK06',
  'COPC': 'COPC_IN000001UK01'
}

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
    validatePayloadEquality(original, modified),
    validateAttachmentEquality(original, modified),
    validateExternalAttachmentEquality(original, modified)
  ];

  return conditions.every(test => test === true);
};

const validateEbXmlEquality = (original, modified) => {
  const ebXMLs = {
    original: parser.parse(JSON.parse(original).ebXML),
    modified: parser.parse(JSON.parse(modified).ebXML)
  };

  // Check original vs modified ebXML
  for (const key in ebXMLs) {
    if (ebXMLs.hasOwnProperty(key)) {
      // Delete the Message ID attribute within MessageData -> MessageId
      delete ebXMLs[key]["soap:Envelope"]["soap:Header"]["eb:MessageHeader"]["eb:MessageData"]["eb:MessageId"];

      // Delete inner manifest Message ID (i.e. mid) references
      if(Array.isArray(ebXMLs[key]["soap:Envelope"]["soap:Body"]["eb:Manifest"]["eb:Reference"])) {
        ebXMLs[key]["soap:Envelope"]["soap:Body"]["eb:Manifest"]["eb:Reference"].forEach(reference => {
          if (reference["@_xlink:href"].includes('mid')) {
            delete reference["@_xlink:href"];
          }
        });
      }
    }
  }

  return isEqual(ebXMLs.original, ebXMLs.modified);
}

const validatePayloadEquality = (original, modified) => {
  const payloads = {
    original: parser.parse(JSON.parse(original).payload),
    modified: parser.parse(JSON.parse(modified).payload)
  };

  for (const key in payloads) {
    if (payloads.hasOwnProperty(key)) {
      if(original.includes(INTERACTION_IDS.UK06) && modified.includes(INTERACTION_IDS.UK06)) {
        // Remove Message ID references within the UK06 message
        delete payloads[key][INTERACTION_IDS.UK06]['id']['@_root'];
        delete payloads[key][INTERACTION_IDS.UK06]['ControlActEvent']['subject']['EhrExtract']['id']['@_root'];
      }
      else if (original.includes(INTERACTION_IDS.COPC) && modified.includes(INTERACTION_IDS.COPC)) {
        // Remove Message ID references within the COPC message
        delete payloads[key][INTERACTION_IDS.COPC]['id']['@_root'];
        delete payloads[key][INTERACTION_IDS.COPC]['ControlActEvent']['subject']['PayloadInformation']['id']['@_root'];
        delete payloads[key][INTERACTION_IDS.COPC]['ControlActEvent']['subject']['PayloadInformation']['value']['Gp2gpfragment']['message-id'];
        delete payloads[key][INTERACTION_IDS.COPC]['ControlActEvent']['subject']['PayloadInformation']['pertinentInformation']['pertinentPayloadBody']['id']['@_root'];
      }
    }
  }

  return isEqual(payloads.original, payloads.modified);
};

const validateAttachmentEquality = (original, modified) => {
  const attachments = {
    original: parser.parse(JSON.parse(original).attachments),
    modified: parser.parse(JSON.parse(modified).attachments)
  };

  return isEqual(attachments.original, attachments.modified);
};

const validateExternalAttachmentEquality = (original, modified) => {
  if(original.includes('external_attachments') && modified.includes('external_attachments'))
  {
    const externalAttachments = {
      original: parser.parse(JSON.parse(original).external_attachments),
      modified: parser.parse(JSON.parse(modified).external_attachments)
    };

    return isEqual(externalAttachments.modified, externalAttachments.modified);
  }

  // No external attachments, skip
  return true;
}