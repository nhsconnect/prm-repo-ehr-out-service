import { pollQueueOnce, startSqsConsumer } from '../sqs-consumer.js';
import { parse } from '../../parser/sqs-incoming-message-parser';
import { SQSClient } from '@aws-sdk/client-sqs';
import { logError } from '../../../middleware/logging';
import { config } from '../../../../test/config';

jest.mock('../../parser/sqs-incoming-message-parser', () => ({
  parse: jest.fn()
}));
jest.mock('../../../middleware/logging');
jest.mock('@aws-sdk/client-sqs');

const EHR_REQUEST_INTERACTION_ID = 'RCMR_IN010000UK05';

describe('sqs consumer', () => {
  it('reads a single message from the queue and invokes the parser with it', async () => {
    const sqsClient = {
      send: jest.fn()
    };

    const parser = jest.fn();
    parser.mockReturnValue({ interactionId: EHR_REQUEST_INTERACTION_ID });

    let messageBody = '{ "key": "this is a stub message" }';
    sqsClient.send.mockResolvedValue({
      $metadata: { attempts: 1, httpStatusCode: 200, totalRetryDelay: 0 },
      Messages: [
        {
          Attributes: { SentTimestamp: '1671103624717' },
          Body: messageBody
        }
      ]
    });

    await pollQueueOnce(sqsClient, parser);

    await expect(sqsClient.send).toHaveBeenCalledTimes(1);
    expect(parser).toHaveBeenNthCalledWith(1, messageBody);

    await expect(parser).toHaveBeenCalledTimes(1);
    await expect(logError).not.toHaveBeenCalled();
  });

  it('should log error if it fails to read message from the queue', async () => {
    const sqsClient = {
      send: jest.fn()
    };
    const errorMessage = 'test error message x';
    const parser = jest.fn();

    sqsClient.send.mockRejectedValue(errorMessage);

    await pollQueueOnce(sqsClient, parser);

    await expect(sqsClient.send).toHaveBeenCalledTimes(1);
    expect(parser).not.toHaveBeenCalled();
    await expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Error reading from EHR out incoming queue, receive call parameters: {"AttributeNames":["SentTimestamp"],"MaxNumberOfMessages":1,"MessageAttributeNames":["All"],"WaitTimeSeconds":20}',
      errorMessage
    );
  });
});
