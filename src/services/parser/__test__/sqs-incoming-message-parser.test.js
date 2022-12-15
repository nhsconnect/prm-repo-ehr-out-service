import { parse } from '../sqs-incoming-message-parser';
import expect from 'expect';
import { XmlParser } from '../xml-parser/xml-parser';
jest.mock('../xml-parser/xml-parser');

const rawEhrRequestBody =
  '{"ebXML":"<soap:Envelope><soap:Header><eb:MessageHeader ></eb:MessageHeader></soap:Header><soap:Body></soap:Body></soap:Envelope>","payload":"<RCMR_IN010000UK05 xmlns:xsi=\\"http://www.w3.org\\" xmlns:xs=\\"XMLSchema\\" type=\\"Message\\" xmlns=\\"urn:hl7-org:v3\\"></RCMR_IN010000UK05>","attachments":[]}';
const ehrRequestMessage = JSON.parse(rawEhrRequestBody);
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
    xmlParser
      .mockReturnValueOnce({
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
      })
      .mockReturnValueOnce({
        data: {
          RCMR_IN010000UK05: {
            ControlActEvent: {
              subject: {
                EhrRequest: {
                  id: { root: 'FFFB3C70-0BCC-4D9E-A441-7E9C41A897AA' },
                  recordTarget: {
                    patient: {
                      id: {
                        extension: '9692842304'
                      }
                    }
                  },
                  author: {
                    AgentOrgSDS: {
                      agentOrganizationSDS: {
                        id: {
                          extension: 'A91720'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

    let parsedMessage = await parse(rawEhrRequestBody);
    expect(xmlParser).toHaveBeenCalledTimes(2);
    expect(xmlParser).toHaveBeenCalledWith(ehrRequestMessage.ebXML);
    expect(xmlParser).toHaveBeenCalledWith(ehrRequestMessage.payload);
    await expect(parsedMessage.interactionId).toBe(expectedParsedMessage.interactionId);
    await expect(parsedMessage.conversationId).toBe(expectedParsedMessage.conversationId);
    await expect(parsedMessage.ehrRequestId).toBe(expectedParsedMessage.ehrRequestId);
    await expect(parsedMessage.nhsNumber).toBe(expectedParsedMessage.nhsNumber);
    await expect(parsedMessage.odsCode).toBe(expectedParsedMessage.odsCode);
  });
});
