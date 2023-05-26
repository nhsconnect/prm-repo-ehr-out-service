import { logError, logInfo, logWarning } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';
import { transferOutEhrCore } from "../transfer/transfer-out-ehr-core";

export default async function ehrRequestHandler(ehrRequest, overrides) {
  const { conversationId } = ehrRequest;
  setCurrentSpanAttributes({ conversationId });

  // TODO [PRMT-2728] The below linee are the old version which retrieves a presigned URL
  // const options = Object.assign({ transferOutEhr }, overrides);
  // const doTransfer = options.transferOutEhr;

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
