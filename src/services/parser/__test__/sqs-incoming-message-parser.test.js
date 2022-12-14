import { parse } from '../sqs-incoming-message-parser';
import { ehrRequest } from './data/RCMR_IN010000UK05';
import expect from 'expect';

const expectedParsedMessage = {
  interactionId: 'RCMR_IN010000UK05',
  conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
  ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
  nhsNumber: '9692842304',
  odsCode: 'A91720'
};

describe('Parse the incoming message from the ehr-out-incoming-queue', () => {
  it('should successfully parse the incoming message', async () => {
    let parsedMessage = await parse(ehrRequest);
    await expect(parsedMessage.interactionId).toBe(expectedParsedMessage.interactionId);
  });
});
