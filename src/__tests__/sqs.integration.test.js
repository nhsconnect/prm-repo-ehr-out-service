import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  ListQueuesCommand,
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';

function ehrRequestMessage() {
  const messageBody =
    'Information about current NY Times fiction bestseller for week of 12/11/2016.';
  return messageBody;
}

function TestSqsClient() {
  const localstackEndpoint = 'http://localhost:4566';
  const awsAccountNo = '000000000000';
  let _client = new SQSClient({ endpoint: localstackEndpoint, region: 'eu-west-2' });

  let client = {};
  client.queue = async queueName => {
    const existingQueues = await _client.send(
      new ListQueuesCommand({ QueueNamePrefix: queueName })
    );

    if (existingQueues.QueueUrls === undefined || existingQueues.QueueUrls.length === 0) {
      await _client.send(new CreateQueueCommand({ QueueName: queueName }));
    }

    let queue = {};

    queue.send = async message => {
      await _client.send(
        new SendMessageCommand({
          MessageBody: message,
          QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}`
        })
      );
    };

    queue.becomesEmpty = async () => {
      const queueAttributes = await _client.send(
        new GetQueueAttributesCommand({
          AttributeNames: ['ApproximateNumberOfMessages'],
          QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}`
        })
      );
      let queueSize = queueAttributes.Attributes['ApproximateNumberOfMessages'];
      return queueSize === '0';
    };

    return queue;
  };
  return client;
}

describe('SQS incoming message handling', () => {
  let sqs;
  beforeEach(() => {
    sqs = TestSqsClient();
  });

  xit('should receive messages from the incoming queue', async () => {
    let queue = await sqs.queue('ehr-out-service-incoming');

    queue.send(ehrRequestMessage());

    expect(await queue.becomesEmpty()).toEqual(true);
  });
});
