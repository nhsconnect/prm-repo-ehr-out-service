import { pollQueueOnce } from '../sqs-consumer.js';
import { logError, logWarning } from '../../../middleware/logging';
import expect from "expect";

// Mocking
jest.mock('../../parser/sqs-incoming-message-parser', () => ({ parse: jest.fn() }));
jest.mock('../../../middleware/logging');
jest.mock('@aws-sdk/client-sqs');

// TODO [PRMT-2728-SEND-FRAGMENTS] Add coverages for lines 24-27, 31-32, 54-59

describe('sqs consumer', () => {
  // ============ COMMON PROPERTIES ============
  const EHR_REQUEST_INTERACTION_ID = 'RCMR_IN010000UK05';
  const SQS_CLIENT = { send: jest.fn() };
  const PARSER = jest.fn();
  const MESSAGE_BODY = {
    ebXML: "I am the ebXML.",
    payload: "I am the HL7v3 Payload.",
    attachments: [
      "I am an attachment."
    ]
  };
  // =================== END ===================

  it('should read a single message from the queue and invoke the parser with the message and acknowledge on success', async () => {
    // when
    PARSER.mockReturnValue({ interactionId: EHR_REQUEST_INTERACTION_ID });
    SQS_CLIENT.send.mockResolvedValue({
      $metadata: { attempts: 1, httpStatusCode: 200, totalRetryDelay: 0 },
      Messages: [
        {
          Attributes: { SentTimestamp: '1671103624717' },
          Body: JSON.stringify(MESSAGE_BODY)
        }
      ]
    });

    await pollQueueOnce(SQS_CLIENT, PARSER);

    // then
    await expect(SQS_CLIENT.send).toHaveBeenCalledTimes(2); // receive + ack
    expect(PARSER).toHaveBeenNthCalledWith(1, JSON.stringify(MESSAGE_BODY));
    await expect(PARSER).toHaveBeenCalledTimes(1);
    await expect(logError).not.toHaveBeenCalled();
  });

  it('reads and parses a single message but does not acknowledge on parse failure', async () => {
    // when
    PARSER.mockRejectedValue({});

    SQS_CLIENT.send.mockResolvedValue({
      $metadata: { attempts: 1, httpStatusCode: 200, totalRetryDelay: 0 },
      Messages: [
        {
          Attributes: { SentTimestamp: '1671103624717' },
          Body: JSON.stringify(MESSAGE_BODY)
        }
      ]
    });

    await pollQueueOnce(SQS_CLIENT, PARSER);

    // then
    await expect(SQS_CLIENT.send).toHaveBeenCalledTimes(1); // receive + no ack
    expect(PARSER).toHaveBeenNthCalledWith(1, JSON.stringify(MESSAGE_BODY));
    await expect(PARSER).toHaveBeenCalledTimes(1);
    await expect(logError).toHaveBeenCalled();
  });

  it('should log an error if it fails to read a message from the queue', async () => {
    // given
    const errorMessage = 'test error message';

    // when
    SQS_CLIENT.send.mockRejectedValue(errorMessage);
    await pollQueueOnce(SQS_CLIENT, PARSER);

    // then
    await expect(SQS_CLIENT.send).toHaveBeenCalledTimes(1);
    expect(PARSER).not.toHaveBeenCalled();
    await expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'Error reading from EHR out incoming queue, receive call parameters: {"AttributeNames":["SentTimestamp"],"MaxNumberOfMessages":1,"MessageAttributeNames":["All"],"WaitTimeSeconds":20}',
      errorMessage
    );
  });

  it('should log a warning if the receive call does not return a messages list', async () => {
    // when
    SQS_CLIENT.send.mockResolvedValue({
      $metadata: { attempts: 1, httpStatusCode: 200, totalRetryDelay: 0 }
    });

    await pollQueueOnce(SQS_CLIENT, PARSER);

    // then
    await expect(SQS_CLIENT.send).toHaveBeenCalledTimes(1);
    expect(PARSER).not.toHaveBeenCalled();
    await expect(logWarning).toHaveBeenCalled();
  });
});
