import { logError, logInfo } from '../../middleware/logging';
import { transferOutEhrCore } from '../transfer/transfer-out-ehr-core';
import { parseEhrRequestMessage } from '../parser/ehr-request-parser';
import { parseConversationId, parseMessageId } from '../parser/parsing-utilities';
import { setCurrentSpanAttributes } from '../../config/tracing';

export default async function ehrRequestHandler(message) {
  const ehrRequest = await parseEhrRequestMessage(message);
  const conversationId = await parseConversationId(message);
  const messageId = await parseMessageId(message);
  setCurrentSpanAttributes({ conversationId });

  logInfo('Trying to handle EHR request');

  /*
  TODO - FUTURE SPIKE?

  Right now we're not sure what the behaviour will be if a request comes in that has previously attempted to send
  (therefore exists in the database), but doesn't have a status of complete. We believe it'd attempt to create a
  second record in the database and could break.
  [1] CHECK IF THE REQUEST ALREADY EXISTS IN THE DATABASE
  [2] IF IT DOES NOT, GREAT, CONTINUE...
  [3] IF IT DOES, WHAT DOES THE STATUS LOOK LIKE?
  [4] IF THE STATUS IS TRANSFER COMPLETE, GREAT, DISREGARD.
  [5] ETC. ETC. ETC. IF IT'S NOT COMPLETE OR FAILED, RETRY?
   */

  try {
    await transferOutEhrCore({
      conversationId,
      nhsNumber: ehrRequest.nhsNumber,
      messageId,
      odsCode: ehrRequest.odsCode,
      ehrRequestId: ehrRequest.ehrRequestId
    });
  } catch (error) {
    logError('EHR out transfer failed due to unexpected error', error);
  }
}
