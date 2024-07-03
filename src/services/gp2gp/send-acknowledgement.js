import axios from 'axios';
import {logError, logInfo} from '../../middleware/logging';
import {config} from '../../config';
import {logOutboundMessage} from "./logging-utils";
import {SendAcknowledgementError} from "../../errors/errors";


/*
 * TODO PRMP-534 fields needed to send out:
 *  String repositoryAsid;
 *  String odsCode;
 *  String conversationId;
 *  String messageId;
 *  String errorCode
 */


export const sendAcknowledgement = async (
  nhsNumber,
  odsCode,
  conversationId,
  messageId,
  acknowledgementErrorCode
) => {
  const { gp2gpMessengerServiceUrl, gp2gpMessengerAuthKeys, repositoryAsid} = config();
  const url = `${gp2gpMessengerServiceUrl}/health-record-requests/${nhsNumber}/acknowledgement"`;

  //  TODO PRMP-534 we need to get the repositoryAsid from somewhere?

  const requestBody = {
    repositoryAsid:
    odsCode,
    conversationId: conversationId.toUpperCase(),
    messageId: messageId.toUpperCase(),
  };

  if (acknowledgementErrorCode == null) {
    logInfo(`POST request to gp2gp-messenger endpoint: ${url} positive acknowledgement message with request body as below:`);
  } else {
    requestBody.errorCode = acknowledgementErrorCode.errorCode
    logError(`POST request to gp2gp-messenger endpoint: ${url} negative acknowledgement message with GP2GP ` +
      `error code ${acknowledgementErrorCode.errorCode} - ${acknowledgementErrorCode.label} and request body as below:`);
  }
  logOutboundMessage(requestBody);

  await axios
    .post(url, requestBody, {headers: {Authorization: gp2gpMessengerAuthKeys}})
    .then(() => logInfo(`Acknowledgement message sent to gp2gp-messenger successfully`))
    .catch(error => throw new SendAcknowledgementError(error));
};
