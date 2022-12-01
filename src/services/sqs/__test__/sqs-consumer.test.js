import { run } from '../sqs-consumer.js';
import { SQSClient } from '@aws-sdk/client-sqs';

jest.mock('@aws-sdk/client-sqs');

describe('sqs consumer', () => {
  it('read message from the queue and invoke parser', async () => {
    const sqsSendMessageSpy = jest.spyOn(SQSClient.prototype, 'send');

    await run();
    expect(sqsSendMessageSpy).toHaveBeenCalled();
  });
});
