import { startSqsConsumer } from '../sqs-consumer.js';
import { parse } from '../../parser/sqs-incoming-message-parser';
import { SQSClient } from '@aws-sdk/client-sqs';

jest.mock('../../parser/sqs-incoming-message-parser');
jest.mock('@aws-sdk/client-sqs');
jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('sqs consumer', () => {
  it('read message from the queue and invoke parser', async () => {
    const sqsSendMessageSpy = jest.spyOn(SQSClient.prototype, 'send');
    sqsSendMessageSpy
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolve({ key: 'this is a test message 1' });
        })
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolve({ key: 'this is a test message 2' });
        })
      );

    await startSqsConsumer();

    expect(sqsSendMessageSpy).toHaveBeenCalled();
    expect(parse).toHaveBeenCalled();
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 100);
    jest.advanceTimersByTime(110);
    expect(sqsSendMessageSpy).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(2);
    // TODO fix expected calls to parse to 2
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('handle error when reading message from the queue', async () => {
    const message = 'test error message';
    const sqsSendMessageSpy = jest.spyOn(SQSClient.prototype, 'send');
    sqsSendMessageSpy.mockReturnValue(
      new Promise((resolve, reject) => {
        reject(message);
      })
    );

    await startSqsConsumer();

    expect(sqsSendMessageSpy).toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
  });
});
