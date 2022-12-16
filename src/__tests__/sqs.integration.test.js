import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';
import { startSqsConsumer } from '../services/sqs/sqs-consumer';
import { config, initialiseConfig } from '../../test/config';
import { readFileSync } from 'fs';

function ehrRequestMessage() {
  return readFileSync('src/__tests__/data/RCMR_IN010000UK05');
}

function TestSqsClient() {
  const awsAccountNo = config.awsAccountNo;
  let _client = new SQSClient({ endpoint: config.localstackEndpointUrl, region: config.region });

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
        new DeleteQueueCommand({
          QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
        })
      );
    },
    send: async (message, queueName) => {
      await _client.send(
        new SendMessageCommand({
          MessageBody: message,
          QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
        })
      );
    },

    becomesEmpty: async queueName => {
      const queueAttributes = await _client.send(
        new GetQueueAttributesCommand({
          AttributeNames: ['ApproximateNumberOfMessages'],
          QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`
        })
      );
      let queueSize = queueAttributes.Attributes['ApproximateNumberOfMessages'];
      return queueSize === '0';
    },

    receive: async queueName => {
      let params = {
        AttributeNames: ['SentTimestamp'],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ['All'],
        QueueUrl: `${config.localstackEndpointUrl}/${awsAccountNo}/${queueName}`,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0
      };
      const receiveMessageCommandOutput = await _client.send(new ReceiveMessageCommand(params));
      return receiveMessageCommandOutput.Messages;
    }
  };

  // let queueSize =
  //   receiveMessageCommandOutput.Messages[0].Attributes['ApproximateNumberOfMessages'].length;
  // return queueSize;
}

describe('SQS incoming message handling', () => {
  let sqs;
  beforeEach(() => {
    initialiseConfig();
    sqs = TestSqsClient();
    startSqsConsumer({ endpoint: config.localstackEndpointUrl, region: config.region });
  });

  xit('should receive messages from the incoming queue', async () => {
    let queue = sqs.queue;

    await queue.create(config.SQS_EHR_OUT_INCOMING_QUEUE_URL).then(() => {
      queue.send(ehrRequestMessage(), config.SQS_EHR_OUT_INCOMING_QUEUE_URL);
    });
    await queue.receive(config.SQS_EHR_OUT_INCOMING_QUEUE_URL);
    expect.assertions(1);
    await expect((await queue.receive(config.SQS_EHR_OUT_INCOMING_QUEUE_URL)).length).toHaveLength(
      1
    );
    await expect(await queue.becomesEmpty(config.SQS_EHR_OUT_INCOMING_QUEUE_URL)).toEqual(true);
    await queue.delete(config.SQS_EHR_OUT_INCOMING_QUEUE_URL);
  });
});
