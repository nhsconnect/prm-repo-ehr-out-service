import { logError, logInfo, logWarning } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";
import { getFragmentFromRepo } from "../ehr-repo/get-fragment";
import { sendFragment } from "../gp2gp/send-fragment";
import { getFragmentsTraceStatusByMessageId } from "../database/fragments-trace-repository";
import { Status } from "../../models/fragments-trace";
import { updateFragmentStatus } from "./transfer-out-util";


export async function transferOutFragment(conversationId, messageId, nhsNumber) {
  setCurrentSpanAttributes({ conversationId, messageId })
  logInfo('EHR transfer out fragment received');

  try {
    if (await isTransferRequestDuplicated(messageId)) return;

    const fragment = await getFragmentFromRepo(nhsNumber, messageId);
    await sendFragment(fragment);
    await updateFragmentStatus(conversationId, messageId, Status.SENT_FRAGMENT);
    logInfo('Fragment transfer completed');
  } catch (error) {
    logError(`Message fragment transfer failed due to error: ${error}`);
    await updateFragmentStatus(conversationId, messageId, Status.FRAGMENT_SENDING_FAILED);
    throw error;
  }
}

const isTransferRequestDuplicated = async (messageId) => {
  // TODO [PRMT-2728] work out what we're doing with a continue request database table - Are we wanting to store this in memory?
  const previousFragmentOut = await getFragmentsTraceStatusByMessageId(messageId);
  if (previousFragmentOut !== null) {
    logWarning('EHR message fragment with this message ID is already in progress')
    return true;
  }
  return false;
}
