import sendMessageToCorrespondingHandler from '../broker';
import { ehrRequestHandler } from '../ehrRequestHandler';
import { logError } from '../../../middleware/logging';

jest.mock('../ehrRequestHandler');
jest.mock('../../../middleware/logging');

const expectedParsedMessage = {
  interactionId: 'RCMR_IN010000UK05',
  conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
  ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
  nhsNumber: '9692842304',
  odsCode: 'A91720'
};

const invalidParsedMessage = {
  interactionId: 'INVALID_INTERACTION_ID'
};

describe('should send message to appropriate handler', () => {
  it('should send message to ehr-request-handler', async () => {
    sendMessageToCorrespondingHandler(expectedParsedMessage);
    await expect(ehrRequestHandler).toHaveBeenCalled();
  });

  it('should log an error when an invalid interaction id is passed', async () => {
    sendMessageToCorrespondingHandler(invalidParsedMessage);
    await expect(logError).toHaveBeenCalled();
    await expect(ehrRequestHandler).not.toHaveBeenCalled();
  });
});
