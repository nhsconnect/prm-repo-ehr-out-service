import sendMessageToCorrespondingHandler from '../broker';
import ehrRequestHandler from '../ehrRequestHandler';
import { logError } from '../../../middleware/logging';

jest.mock('../ehrRequestHandler');
jest.mock('../../../middleware/logging');

const EHR_REQUEST_INTERACTION_ID = 'RCMR_IN010000UK05';

describe('broker', () => {
  it('should hand off to ehr-request-handler if it is an EHR request', async () => {
    sendMessageToCorrespondingHandler({
      interactionId: EHR_REQUEST_INTERACTION_ID,
      conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
      ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
      nhsNumber: '9692842304',
      odsCode: 'A91720'
    });

    await expect(ehrRequestHandler).toHaveBeenCalled();
  });

  it('should throw an error when any other interaction id is passed', async () => {
    expect(() => sendMessageToCorrespondingHandler({
      interactionId: 'INVALID_INTERACTION_ID'
    })).toThrow(/Invalid interaction ID/) // is this really an invalid interaction ID or just an unknown one?
    await expect(logError).toHaveBeenCalled();
    await expect(ehrRequestHandler).not.toHaveBeenCalled();
  });
});
