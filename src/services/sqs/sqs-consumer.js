import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { parse } from '../parser/sqs-incoming-message-parser.js';
import { logError } from '../../middleware/logging';
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
const pollQueue = sqsClient => {
  sqsClient
    .send(new ReceiveMessageCommand(getParams()))
    .then(data => {
      processMessages(data);
    })
    .catch(err => {
      logError('Error reading from EHR out incoming queue', err);
    });
  setTimeout(() => pollQueue(sqsClient), 100);
};

const processMessages = receiveMessageCommandOutput => {
  try {
    receiveMessageCommandOutput.Messages.forEach(message => {
      const parsedMessage = parse(message.Body);
      sendMessageToCorrespondingHandler(parsedMessage);
    });
  } catch (err) {
    console.log('Receive Error', err);
  }
};
