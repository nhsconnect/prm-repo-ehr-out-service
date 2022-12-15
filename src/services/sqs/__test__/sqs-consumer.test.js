import { startSqsConsumer } from '../sqs-consumer.js';
import { parse } from '../../parser/sqs-incoming-message-parser';
import { SQSClient } from '@aws-sdk/client-sqs';
import { logError } from '../../../middleware/logging';
import { config } from '../../../../test/config';

jest.mock('../../parser/sqs-incoming-message-parser');
jest.mock('../../../middleware/logging');
jest.mock('@aws-sdk/client-sqs');

describe('sqs consumer', () => {
  it('read message from the queue and invoke parser', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    const sqsSendMessageSpy = jest.spyOn(SQSClient.prototype, 'send');
    const message1 = {
      $metadata: { attempts: 1, httpStatusCode: 200, totalRetryDelay: 0 },
      Messages: [
        {
          Attributes: { SentTimestamp: '1671103624717' },
          Body: '{ "key": "this is a test message 1" }'
        }
      ]
    };
    const message2 = {
      $metadata: { attempts: 1, httpStatusCode: 200, totalRetryDelay: 0 },
      Messages: [
        {
          Attributes: { SentTimestamp: '1671103624717' },
          Body: '{ "key": "this is a test message 2" }'
        }
      ]
    };
    const errorMessage = 'test error message';

    sqsSendMessageSpy
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolve(message1);
        })
      )
      .mockReturnValueOnce(
        new Promise((resolve, reject) => {
          reject(errorMessage);
        })
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolve(message2);
        })
      );

    await startSqsConsumer();
    await jest.advanceTimersByTime(210);

    expect(SQSClient.mock.calls[0][0]).toStrictEqual({
      region: config.region
    });
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 100);
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(sqsSendMessageSpy).toHaveBeenCalledTimes(3);
    expect(parse).toHaveBeenNthCalledWith(1, message1.Messages[0].Body);
    expect(parse).toHaveBeenNthCalledWith(2, message2.Messages[0].Body);
    await expect(parse).toHaveBeenCalledTimes(2);
    await expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Error reading from EHR out incoming queue',
      errorMessage
    );
  });

  it('sqs client is configurable', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    const sqsSendMessageSpy = jest.spyOn(SQSClient.prototype, 'send');
    const message1 = { key: 'this is a test message 1' };

    sqsSendMessageSpy.mockReturnValueOnce(
      new Promise(resolve => {
        resolve(message1);
      })
    );

    await startSqsConsumer({ endpoint: config.localstackEndpointUrl, region: config.region });

    expect(SQSClient.mock.calls[0][0]).toStrictEqual({
      endpoint: config.localstackEndpointUrl,
      region: config.region
    });
  });
});
