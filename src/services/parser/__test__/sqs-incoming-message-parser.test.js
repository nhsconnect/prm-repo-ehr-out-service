import { v4 } from 'uuid';
import { parse } from '../sqs-incoming-message-parser';
//Interaction ID, Conversation ID, NHS Number, ODS Code, EHR Request ID
const interactionId = v4();
const conversationId = v4();
const ehrRequestId = v4();
const nhsNumber = '1234567891';
const odsCode = 'TEST123';

const incomingMessageBody = {
  data: {
    // type: 'ehr-out-requests',
    id: conversationId,
    attributes: {
      interactionId,
      ehrRequestId,
      nhsNumber,
      odsCode
    }
  }
};

describe('Parse the incoming message from the ehr-out-incoming-queue', () => {
  xit('should successfully parse the incoming message', () => {
    let parsedMessage = parse(incomingMessageBody);
    console.log(parsedMessage);
    // expect(parsedMessage.nhsNumber).toBe(nhsNumber);
  });
});
