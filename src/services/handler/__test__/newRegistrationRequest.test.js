import newRegistrationRequest from '../newRegistrationRequest';
// import { getRegistrationRequestStatusByConversationId } from '../../database/registration-request-repository';
jest.mock('../../database/registration-request-repository', () => ({
  getRegistrationRequestStatusByConversationId: jest.fn().mockReturnValue(null)
}));

describe('newRegistrationRequest', () => {
  const expectedParsedMessage = {
    interactionId: 'RCMR_IN010000UK05',
    conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
    ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
    nhsNumber: '9692842304',
    odsCode: 'A91720'
  };

  const getRegistrationRequestStatusByConversationId = jest.fn().mockReturnValueOnce(null);

  xit('should call validation functions correctly', () => {
    expect(getRegistrationRequestStatusByConversationId).toHaveBeenCalledWith(
      expectedParsedMessage.conversationId
    );
    expect(getRegistrationRequestStatusByConversationId).toHaveBeenCalledTimes(1);
  });
});
