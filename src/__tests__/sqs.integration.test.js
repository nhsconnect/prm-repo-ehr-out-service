import { startSqsConsumer, stopSqsConsumer } from '../services/sqs/sqs-consumer';
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

  client.queue = queueName => {
    let queue = {
      create: () => createQueue(queueName),
      ensureEmpty: async () => {
        try {
          await deleteQueue(queueName);
        } catch (e) {
          console.log('Error deleting queue ' + e);
        }
        await createQueue(queueName);
      },
      delete: deleteQueue,
      send: async message => {
        await _client.send(
          new SendMessageCommand({
            MessageBody: message,
            QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
          })
        );
      },

      visibleMessageCount: async () => {
        const queueAttributes = await _client.send(
          new GetQueueAttributesCommand({
            AttributeNames: ['ApproximateNumberOfMessages'],
            QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
          })
        );
        let queueSize = queueAttributes.Attributes['ApproximateNumberOfMessages'];
        return parseInt(queueSize);
      },

      isEmpty: async () => {
        let queueSize = await size(queueName);
        return queueSize === 0;
      }
    };
    return queue;
  };
  return client;
}

describe('SQS incoming message handling', () => {
  let sqs, queue;
  beforeEach(async () => {
    sqs = TestSqsClient();
    queue = sqs.queue(config.SQS_EHR_OUT_INCOMING_QUEUE_NAME);
    await queue.ensureEmpty();
  });

  beforeEach(() => {
    initialiseAppConfig();
  });

  afterEach(stopSqsConsumer);

  function startAppSqsConsumer() {
    startSqsConsumer({ endpoint: config.localstackEndpointUrl, region: config.region });
  }

  it('should receive messages from the incoming queue once the sqs consumer started', async () => {
    await expect(await queue.visibleMessageCount()).toEqual(0);

    await queue.send(ehrRequestMessage());

    await expect(await queue.visibleMessageCount()).toEqual(1);

    startAppSqsConsumer();

    await waitForExpect(async () => {
      expect(await queue.visibleMessageCount()).toEqual(0);
    });
  });
});
