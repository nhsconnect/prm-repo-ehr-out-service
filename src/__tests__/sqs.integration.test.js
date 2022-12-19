import { startSqsConsumer } from '../services/sqs/sqs-consumer';
import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  ListQueuesCommand,
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';
import { config, initialiseAppConfig } from '../../test/config';
import { readFileSync } from 'fs';

const waitForExpect = require('wait-for-expect');

function ehrRequestMessage() {
  return readFileSync('src/__tests__/data/RCMR_IN010000UK05');
}

function TestSqsClient() {
  const awsAccountNo = config.awsAccountNo;
  let _client = new SQSClient({ endpoint: config.localstackEndpointUrl, region: config.region });

  let client = {};
  let deleteQueue = async queueName => {
    await _client.send(
      new DeleteQueueCommand({
        QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
      })
    );
  };

  let createQueue = async queueName => {
    const existingQueues = await _client.send(
      new ListQueuesCommand({ QueueNamePrefix: queueName })
    );

    if (existingQueues.QueueUrls === undefined || existingQueues.QueueUrls.length === 0) {
      await _client.send(new CreateQueueCommand({ QueueName: queueName }));
    }
  };

  const size = async queueName => {
    const queueAttributes = await _client.send(
      new GetQueueAttributesCommand({
        AttributeNames: ['ApproximateNumberOfMessages'],
        QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
      })
    );
    let queueSize = queueAttributes.Attributes['ApproximateNumberOfMessages'];
    return parseInt(queueSize);
  };

  client.queue = {
    create: createQueue,
    ensureEmptyQueueIsCreated: async queueName => {
      try {
        await deleteQueue(queueName);
      } catch (e) {
        console.log('Error deleting queue ' + e);
      }
      await createQueue(queueName);
    },
    delete: deleteQueue,
    send: async (message, queueName) => {
      await _client.send(
        new SendMessageCommand({
          MessageBody: message,
          QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
        })
      );
    },

    size,

    isEmpty: async queueName => {
      let queueSize = await size(queueName);
      return queueSize === 0;
    }
  };
  return client;
}

describe('SQS incoming message handling', () => {
  let sqs;
  beforeEach(async () => {
    sqs = TestSqsClient();
    await sqs.queue.ensureEmptyQueueIsCreated(config.SQS_EHR_OUT_INCOMING_QUEUE_NAME);
  });

  beforeEach(() => {
    initialiseAppConfig();
    startSqsConsumer({ endpoint: config.localstackEndpointUrl, region: config.region });
  });

  it('should receive messages from the incoming queue', async () => {
    let queue = sqs.queue;

    await queue.send(ehrRequestMessage(), config.SQS_EHR_OUT_INCOMING_QUEUE_NAME);

    await waitForExpect(async () => {
      let hasReceivedMessage = await queue.isEmpty(config.SQS_EHR_OUT_INCOMING_QUEUE_NAME);
      expect(hasReceivedMessage).toEqual(true);
    });
  });
});
