import { logInfo } from "../../middleware/logging";
import { setCurrentSpanAttributes } from "../../config/tracing";

export async function transferOutFragment(parsedMessage) {
  setCurrentSpanAttributes(conversationId, messageId)

  logInfo('EHR transfer out fragment received');

  // [1] Check for a duplicate transfer out request
  checkForDuplicateTransferRequest();
  // [2] TODO figure out if we need to create a transfer request (similar to line 34 of transfer-out-ehr-core.js) - X
  // [3] Get the fragment from the repo
  const fragment = await getFragment(nhsNumber, messageId);
  // [4] TODO figure out if we need to check if the ODS code matches - Might as well reuse
  // [5] TODO figure out if we need to update the 'registration request code status' - X
  // [6] Send the fragment
  await sendFragment(fragment);
}

const checkForDuplicateTransferRequest = async () => {
  const previousFragmentOut = await getContinueRequestStatusByMessageId();
}

const getFragment = async (nhsNumber, messageId) => {
  logInfo('Getting message fragment from EHR repo');
  return await getFragmentFromRepo(nhsNumber, messageId)
}

const sendFragment = async (fragment) => { }

const updateConversationStatus = () => { }
