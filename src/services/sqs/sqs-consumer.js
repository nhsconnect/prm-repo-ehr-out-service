import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { parse } from '../parser/sqs-incoming-message-parser.js';
import {logError, logInfo, logWarning} from '../../middleware/logging';
import sendMessageToCorrespondingHandler from '../handler/broker';

const INTER_POLL_DELAY_MS = 50;
const POLL_WAIT_TIME_SECONDS = 5;

const receiveCallParameters = () => {
  return {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 1,
    MessageAttributeNames: ['All'],
    QueueUrl: process.env.SQS_EHR_OUT_INCOMING_QUEUE_URL,
    WaitTimeSeconds: POLL_WAIT_TIME_SECONDS
  };
};

let stop;

export const startSqsConsumer = (
  config = { region: process.env.AWS_DEFAULT_REGION || 'eu-west-2' }
) => {
  logInfo('Starting SQS consumer');
  stop = false;
  const sqsClient = new SQSClient(config);
  pollQueue(sqsClient);
};

export const stopSqsConsumer = () => {
  logInfo('Requesting stop of SQS consumer');
  stop = true;
};

export const pollQueueOnce = (sqsClient, parser) => {
  logInfo('Polling for incoming messages');
  return sqsClient
    .send(new ReceiveMessageCommand(receiveCallParameters()))
    .then(data => {
      logInfo('Received message data');
      processMessages(data, parser);
    })
    .catch(err => {
      logError(
        `Error reading from EHR out incoming queue, receive call parameters: ${readable(
          receiveCallParameters()
        )}`,
        err
      );
    });
};

const pollQueue = async sqsClient => {
  if (stop) {
    logInfo('SQS consumer poll stopped.');
    return;
  }
  await pollQueueOnce(sqsClient, parse);
  setTimeout(() => pollQueue(sqsClient), INTER_POLL_DELAY_MS);
};

const processMessages = (receiveResponse, parser) => {
  try {
    let messages = receiveResponse.Messages;
    if (messages === undefined) {
      logWarning('Messages undefined on response, metadata: ' + JSON.stringify(receiveResponse.$metadata))
      return;
    }
    messages.forEach(message => {
      const parsedMessage = parser(message.Body);
      sendMessageToCorrespondingHandler(parsedMessage);
      // sqsClient.send(
      //   new DeleteMessageCommand({
      //     ReceiptHandle: message.ReceiptHandle
      //   })
      // );
    });
  } catch (err) {
    logError('Receive Error', err);
  }
};

const readable = obj => JSON.stringify(obj);
