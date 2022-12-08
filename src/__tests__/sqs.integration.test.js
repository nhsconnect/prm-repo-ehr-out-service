import { ReceiveMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

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
  client.queue = queueName => ({
    send: async message => {
      await _client.send(
        new SendMessageCommand({
          MessageBody: message,
          QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}`
        })
      );
    },
    becomesEmpty: async () => {
      const data = await _client.send(
        new ReceiveMessageCommand({
          QueueUrl: `${localstackEndpoint}/${awsAccountNo}/${queueName}`
        })
      );
      return data.Messages === undefined;
    }
  });
  return client;
}

describe('SQS incoming message handling', () => {
  let sqs;
  beforeEach(() => {
    sqs = TestSqsClient();
  });

  xit('should receive messages from the incoming queue', async () => {
    let queue = sqs.queue('ehr-out-service-incoming');

    queue.send(ehrRequestMessage());
    expect(await queue.becomesEmpty()).toEqual(true);
  });
});
