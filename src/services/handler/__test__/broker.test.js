import sendMessageToCorrespondingHandler from '../broker';
import ehrRequestHandler from '../ehr-request-handler';
import { logError, logInfo } from "../../../middleware/logging";
import { INTERACTION_IDS } from '../../../constants/interaction-ids';
import continueMessageHandler from "../continue-message-handler";

jest.mock('../ehr-request-handler');
jest.mock('../continue-message-handler');
jest.mock('../../../middleware/logging');

describe('broker', () => {
  it('should hand off to ehr-request-handler if it is an EHR request', async () => {
    let ehrRequest = {
      interactionId: INTERACTION_IDS.EHR_REQUEST_INTERACTION_ID,
      conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
      ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
      nhsNumber: '9692842304',
      odsCode: 'A91720'
    };

    await sendMessageToCorrespondingHandler(ehrRequest);

    await expect(ehrRequestHandler).toHaveBeenCalledWith(ehrRequest);
  });

  it('should hand off to continue-message-handler if it is a continue request', async () => {
    let continueRequest = {
      interactionId: INTERACTION_IDS.CONTINUE_REQUEST_INTERACTION_ID,
      conversationId: '27a757f2-f4d2-444e-a246-9cb77bef7f22',
      nhsNumber: '8692842304',
      odsCode: 'B91720'
    };

    await sendMessageToCorrespondingHandler(continueRequest);

    await expect(continueMessageHandler).toHaveBeenCalledWith(continueRequest);
  });

  it('should log if it is an acknowledgement response', async () => {
    let acknowledgementResponse = {
      interactionId: INTERACTION_IDS.ACKNOWLEDGEMENT_INTERACTION_ID,
      conversationId: '37a757f2-f4d2-444e-a246-9cb77bef7f22',
      nhsNumber: '7692842304',
      odsCode: 'C91720'
    };

    await sendMessageToCorrespondingHandler(acknowledgementResponse);

    expect(logInfo).toHaveBeenCalledWith('Message Type: ACKNOWLEDGEMENT RESPONSE');

  });

  it('should throw an error when any other interaction id is passed', async () => {
    expect(() =>
      sendMessageToCorrespondingHandler({
        interactionId: 'INVALID_INTERACTION_ID'
      })
    ).rejects.toThrow(/Invalid interaction ID/); // is this really an invalid interaction ID or just an unknown one?
    await expect(logError).toHaveBeenCalled();
    await expect(ehrRequestHandler).not.toHaveBeenCalled();
  });
});
