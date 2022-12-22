import { logError, logInfo, logWarning } from '../../middleware/logging';
import { transferOutEhr } from '../transfer/transfer-out-ehr';

export default async function ehrRequestHandler(ehrRequest, overrides) {
  const options = Object.assign({ transferOutEhr }, overrides);

  const doTransfer = options.transferOutEhr;

  logInfo('Trying to handle EHR request');

  let result = await doTransfer(ehrRequest);
  if (result.inProgress) {
    logWarning('EHR out transfer with this conversation ID is already in progress');
  }
  else if (result.hasFailed) {
    logError('EHR out transfer failed due to error: ' + result.error);
  }
  else {
    logInfo('EHR transfer out started');
  }
}
