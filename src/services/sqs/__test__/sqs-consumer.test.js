import { processMessage } from '../sqs-consumer.js';
import { SQSClient } from '@aws-sdk/client-sqs';

jest.mock('@aws-sdk/client-sqs');

describe('sqs consumer', () => {
  xit('read message from the queue and invoke parser', async () => {
    const sqsSendMessageSpy = jest.spyOn(SQSClient.prototype, 'send');

    await processMessage();
    expect(sqsSendMessageSpy).toHaveBeenCalled();
  });
});
