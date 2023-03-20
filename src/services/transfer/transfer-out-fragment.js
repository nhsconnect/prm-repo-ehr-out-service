import { logError, logInfo, logWarning } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { getFragmentFromRepo } from "../ehr-repo/get-fragment";

export async function transferOutFragment(parsedMessage) {
  setCurrentSpanAttributes({ conversationId, messageId })

  logInfo('EHR transfer out fragment received');

  try {
    // [1] Check for a duplicate transfer out request
    if (await isTransferRequestDuplicated()) return;

    // [2] TODO figure out if we need to create a transfer request (similar to line 34 of transfer-out-ehr-core.js) - X
    // [3] Get the fragment from the repo
    const fragment = await getFragmentFromRepo(nhsNumber, messageId);
    // [4] TODO figure out if we need to update the 'registration request code status' - X
    // [5] Send the fragment
    await sendFragment(fragment);
  } catch (error) {
    logError(`Message fragment transfer failed due to error: ${error}`);
    // TODO throw a new download error and stop the entire message transfer process
  }
}

const isTransferRequestDuplicated = async () => {
  // TODO [PRMT-2728] work out what we're doing with a continue request database table - Are we wanting to store this in memory?
  const previousFragmentOut = await getContinueRequestStatusByMessageId();
  if (previousFragmentOut !== null) {
    logWarning('EHR message fragment with this message ID is already in progress');
    return true;
  }
  return false;
}
