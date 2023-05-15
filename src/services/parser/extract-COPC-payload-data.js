import { XmlParser } from './xml-parser/xml-parser';
import { logInfo } from '../../middleware/logging';

export const extractCOPCPayloadData = async (payload) => {
  const payloadAsObject = await new XmlParser().parse(payload);
  logInfo('parsed payload to object');

  const copcContent = payloadAsObject['data']['COPC_IN000001UK01']['ControlActEvent']['subject']['PayloadInformation'];

  const odsCode = copcContent['value']['Gp2gpfragment']['From']

  return { odsCode };
};
