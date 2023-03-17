import { setCurrentSpanAttributes } from "../../config/tracing";
import { logError, logInfo, logWarning } from "../../middleware/logging";
import { transferOutFragment } from "../transfer/transfer-out-fragment";
import { transferOutEhrCore } from "../transfer/transfer-out-ehr-core";

export default async function continueRequestHandler(parsedMessage) {

  // Set logging attributes.
  const { conversationId } = parsedMessage;
  setCurrentSpanAttributes({ conversationId: conversationId });

  logInfo('Trying to handle continue request')

  // TODO [PRMT-2728] update conversation status to say fragments are being retrieved

  // TODO [PRMT-2728] loop through each fragment ID
  // Execute the transfer logic.
  const result = await transferOutFragment(parsedMessage);

  // TODO [PRMT-2728] update conversation status to say it's done

  // Handle the state accordingly.
  // if (result.inProgress) {
  //   logWarning('EHR out transfer with this conversation ID is already in progress');
  // } else if (result.hasFailed) {
  //   logError('EHR out transfer failed due to error: ' + result.error);
  // } else {
  //   logInfo('EHR transfer out started');
  // }
}