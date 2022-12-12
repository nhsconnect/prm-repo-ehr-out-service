import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  ListQueuesCommand,
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';
import { startSqsConsumer } from '../services/sqs/sqs-consumer';
import { config } from '../../test/config';

function ehrRequestMessage() {
  const messageBody =
    'Information about current NY Times fiction bestseller for week of 12/11/2016.';
  return messageBody;
}

function TestSqsClient() {
  const localstackEndpoint = config.localstackEndpointUrl;
  const awsAccountNo = config.awsAccountNo;
  let _client = new SQSClient({ endpoint: localstackEndpoint, region: config.region });

  let client = {};
  client.queue = {
    create: async queueName => {
      const existingQueues = await _client.send(
        new ListQueuesCommand({ QueueNamePrefix: queueName })
      );

      if (existingQueues.QueueUrls === undefined || existingQueues.QueueUrls.length === 0) {
        await _client.send(new CreateQueueCommand({ QueueName: queueName }));
      }
    },
    delete: async queueName => {
      await _client.send(
        new DeleteQueueCommand({ QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}` })
      );
    },
    send: async (message, queueName) => {
      await _client.send(
        new SendMessageCommand({
          MessageBody: message,
          QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}`
        })
      );
    },

    becomesEmpty: async queueName => {
      const queueAttributes = await _client.send(
        new GetQueueAttributesCommand({
          AttributeNames: ['ApproximateNumberOfMessages'],
          QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}`
        })
      );
      let queueSize = queueAttributes.Attributes['ApproximateNumberOfMessages'];
      return queueSize === '0';
    }
  };
  return client;
}

describe('SQS incoming message handling', () => {
  let sqs;
  beforeEach(() => {
    sqs = TestSqsClient();
    startSqsConsumer();
  });
  afterEach(() => {
    sqs.queue.delete(config.SQS_EHR_OUT_INCOMING_QUEUE_URL);
  });

  xit('should receive messages from the incoming queue', async () => {
    let queue = sqs.queue;
    await queue.create(config.SQS_EHR_OUT_INCOMING_QUEUE_URL).then(() => {
      queue.send(ehrRequestMessage(), config.SQS_EHR_OUT_INCOMING_QUEUE_URL);
    });

    expect(await queue.becomesEmpty(config.SQS_EHR_OUT_INCOMING_QUEUE_URL)).toEqual(true);
  });
});
