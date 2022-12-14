import { parse } from '../sqs-incoming-message-parser';
import { ehrRequest } from './data/RCMR_IN010000UK05';
import expect from 'expect';
import { XmlParser } from '../xml-parser/xml-parser';
jest.mock('../xml-parser/xml-parser');

const expectedParsedMessage = {
  interactionId: 'RCMR_IN010000UK05',
  conversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22',
  ehrRequestId: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA',
  nhsNumber: '9692842304',
  odsCode: 'A91720'
};

describe('Parse the incoming message from the ehr-out-incoming-queue', () => {
  it('should successfully parse the incoming message', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');
    xmlParser.mockReturnValueOnce({
      data: {
        Envelope: {
          Header: {
            MessageHeader: {
              Action: 'RCMR_IN010000UK05',
              ConversationId: '17a757f2-f4d2-444e-a246-9cb77bef7f22'
            }
          }
        }
      }
    });
    let parsedMessage = await parse(ehrRequest);
    expect(xmlParser).toHaveBeenCalledTimes(1);
    await expect(parsedMessage.interactionId).toBe(expectedParsedMessage.interactionId);
    await expect(parsedMessage.conversationId).toBe(expectedParsedMessage.conversationId);
  });
});
