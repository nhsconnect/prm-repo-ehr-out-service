import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { parse } from '../parser/sqs-incoming-message-parser.js';
import { logError } from '../../middleware/logging';

const sqsClient = new SQSClient({ region: process.env.AWS_DEFAULT_REGION || 'eu-west-2' });
const ehrOutIncoming = process.env.SQS_EHR_OUT_INCOMING_QUEUE_URL;

const params = {
  AttributeNames: ['SentTimestamp'],
  MaxNumberOfMessages: 1,
  MessageAttributeNames: ['All'],
  QueueUrl: ehrOutIncoming,
  WaitTimeSeconds: 20
};
export const startSqsConsumer = () => {
  pollQueue();
};
const pollQueue = () => {
  sqsClient
    .send(new ReceiveMessageCommand(params))
    .then(data => {
      processMessage(data);
    })
    .catch(err => {
      logError('Error reading from EHR out incoming queue', err);
    });
  // processMessage(message);
  setTimeout(pollQueue, 100);
};

export const processMessage = data => {
  try {
    parse(data);
    return data;
  } catch (err) {
    console.log('Receive Error', err);
  }
};
