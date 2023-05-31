import { logError, logInfo, logWarning } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { transferOutEhrCore } from "../transfer/transfer-out-ehr-core";
import { parseEhrRequestMessage } from "../parser/ehr-request-parser";
import { parseConversationId } from "../parser/parsing-utilities";

export default async function ehrRequestHandler(message, overrides) {
  const ehrRequest = await parseEhrRequestMessage(message);
  const conversationId = await parseConversationId(message);
  setCurrentSpanAttributes({ conversationId });

  const options = Object.assign({ transferOutEhrCore }, overrides);
  const doTransfer = options.transferOutEhrCore;

  logInfo('Trying to handle EHR request');

  let result = await doTransfer({
    conversationId,
    nhsNumber: ehrRequest.nhsNumber,
    odsCode: ehrRequest.odsCode,
    ehrRequestId: ehrRequest.ehrRequestId
  });

  if (result.inProgress) {
    logWarning('EHR out transfer with this conversation ID is already in progress');
  } else if (result.hasFailed) {
    logError('EHR out transfer failed due to error: ' + result.error);
  } else {
    logInfo('EHR transfer out started');
  }
}
