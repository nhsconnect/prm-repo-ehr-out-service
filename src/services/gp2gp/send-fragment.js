import axios from 'axios';
import {logInfo, logWarning} from '../../middleware/logging';
import {config} from '../../config';
import {FragmentSendingError} from '../../errors/errors';
import {logOutboundMessage} from './logging-utils';
import {createFragmentDbRecord} from '../database/create-fragment-db-record';
import {updateFragmentStatus} from '../transfer/transfer-out-util';
import {Status} from '../../models/message-fragment';
import {getMessageFragmentRecordByMessageId} from '../database/message-fragment-repository';
import {setCurrentSpanAttributes} from '../../config/tracing';

export const sendFragment = async (conversationId, odsCode, fragmentMessage, messageId) => {
  const {gp2gpMessengerAuthKeys, gp2gpMessengerServiceUrl} = config();
  const sendFragmentEndpoint = `${gp2gpMessengerServiceUrl}/ehr-out-transfers/fragment`;
  const requestBody = {conversationId, odsCode, fragmentMessage, messageId};

  setCurrentSpanAttributes({conversationId, messageId});

  logInfo(`Started to send fragment with Message ID: ${messageId}, outbound Conversation ID ${conversationId}.`);

  if (await hasFragmentBeenSent(messageId)) return;

  await createFragmentDbRecord(messageId, conversationId);

  logInfo('POST request has been made to the GP2GP Messenger `/ehr-out-transfers/fragment` endpoint with request body as below:');
  logOutboundMessage(requestBody);

  await axios
    .post(sendFragmentEndpoint, requestBody, {headers: {Authorization: gp2gpMessengerAuthKeys}})
    .then(() => {
      logInfo('Successfully sent message fragment');
    })
    .catch(async error => {
      await updateFragmentStatus(conversationId, messageId, Status.FRAGMENT_SENDING_FAILED);
      throw new FragmentSendingError(error, messageId);
    });

  await updateFragmentStatus(conversationId, messageId, Status.SENT_FRAGMENT);
};

const hasFragmentBeenSent = async messageId => {
  const previousTransferOut = await getMessageFragmentRecordByMessageId(messageId);
  if (previousTransferOut?.status === Status.SENT_FRAGMENT) {
    logWarning(`EHR message FRAGMENT with message ID ${messageId} has already been sent`);
    return true;
  }
  logInfo(`Checked that fragment with message id: ${messageId} is not sent yet`);
  return false;
};