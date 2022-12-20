import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { parse } from '../parser/sqs-incoming-message-parser.js';
import { logError, logInfo } from '../../middleware/logging';
import sendMessageToCorrespondingHandler from '../handler/broker';

const getParams = () => {
  return {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 1,
    MessageAttributeNames: ['All'],
    QueueUrl: process.env.SQS_EHR_OUT_INCOMING_QUEUE_URL,
    WaitTimeSeconds: 20
  };
};

export const startSqsConsumer = (
  config = { region: process.env.AWS_DEFAULT_REGION || 'eu-west-2' }
) => {
  const sqsClient = new SQSClient(config);
  pollQueue(sqsClient);
};

export const pollQueueOnce = (sqsClient, parser) => {
  let receiveCallParameters = getParams();

  logInfo('Polling for incoming messages');
  sqsClient
    .send(new ReceiveMessageCommand(receiveCallParameters))
    .then(data => {
      logInfo('Received message data');
      processMessages(data, parser);
    })
    .catch(err => {
      logError(
        `Error reading from EHR out incoming queue, receive call parameters: ${readable(
          receiveCallParameters
        )}`,
        err
      );
    });
}

const pollQueue = sqsClient => {
  pollQueueOnce(sqsClient, parse);
  setTimeout(() => pollQueue(sqsClient), 100);
};

const processMessages = (receiveMessageCommandOutput, parser) => {
  try {
    receiveMessageCommandOutput.Messages.forEach(message => {
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
