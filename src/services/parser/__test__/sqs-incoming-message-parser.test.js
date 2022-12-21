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

const validEhrRequestPayloadAsJson = {
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
};

let validEbXmlAsJson = {
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
};

describe('sqs incoming message parser', () => {
  it('should successfully parse a valid ehr-request message', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser.mockReturnValueOnce(validEbXmlAsJson).mockReturnValueOnce(validEhrRequestPayloadAsJson);

    let parsedMessage = await parse(rawEhrRequestBody);

    await expect(parsedMessage.interactionId).toBe(expectedParsedMessage.interactionId);
    await expect(parsedMessage.conversationId).toBe(expectedParsedMessage.conversationId);
    await expect(parsedMessage.ehrRequestId).toBe(expectedParsedMessage.ehrRequestId);
    await expect(parsedMessage.nhsNumber).toBe(expectedParsedMessage.nhsNumber);
    await expect(parsedMessage.odsCode).toBe(expectedParsedMessage.odsCode);
  });

  it('should throw if cannot parse json wrapper', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    await expect(() => parse('foobar')).rejects.toThrow(/Error parsing/)
  });

  it('should throw if cannot parse ebxml', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser.mockRejectedValue('boom');

    await expect(() => parse({ ebXML: 'notxml' })).rejects.toThrow(/Error parsing/)
  });

  it('should throw if cannot parse as ehr request message', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser.mockReturnValue({
      data: {
        notWhatYouExpect: true
      }
    });

    await expect(() => parse(rawEhrRequestBody)).rejects.toThrow(/Error parsing/)
  });

  it('should throw if interaction ID is missing', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    const ebxmlWithoutInteractionId = JSON.parse(JSON.stringify(validEbXmlAsJson));
    ebxmlWithoutInteractionId.data.Envelope.Header.MessageHeader.Action = undefined;

    xmlParser.mockReturnValueOnce(ebxmlWithoutInteractionId);

    await expect(() => parse(rawEhrRequestBody)).rejects.toThrow(/interaction ID/)
  });
});
