import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { parse } from '../parser/sqs-incoming-message-parser.js';

const sqsClient = new SQSClient({ region: process.env.AWS_DEFAULT_REGION || 'eu-west-2' });
const ehrOutIncoming = process.env.SQS_EHR_OUT_INCOMING_QUEUE_URL;

export const run = async () => {
  try {
    const data = await sqsClient.send(new ReceiveMessageCommand({ QueueUrl: ehrOutIncoming }));
    parse();
    return data;
  } catch (err) {
    console.log('Receive Error', err);
  }
};
