import { parse } from '../sqs-incoming-message-parser';
import expect from 'expect';
import { XmlParser } from '../xml-parser/xml-parser';

jest.mock('../xml-parser/xml-parser');

const rawEhrRequestBody =
  '{"ebXML":"<soap:Envelope><soap:Header><eb:MessageHeader ></eb:MessageHeader></soap:Header><soap:Body></soap:Body></soap:Envelope>","payload":"<RCMR_IN010000UK05 xmlns:xsi=\\"http://www.w3.org\\" xmlns:xs=\\"XMLSchema\\" type=\\"Message\\" xmlns=\\"urn:hl7-org:v3\\"></RCMR_IN010000UK05>","attachments":[]}';

const expectedParsedEhrRequestMessage = {
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

let validEhrRequestEbXmlAsJson = {
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


const rawContinueRequestBody =
    '{"ebXML":"<SOAP:Envelope><SOAP:Header><eb:MessageHeader><eb:ConversationId>6E242658-3D8E-11E3-A7DC-172BDA00FA67</eb:ConversationId><eb:Action>COPC_IN000001UK01</eb:Action></eb:MessageHeader></SOAP:Header><SOAP:Body></SOAP:Body></SOAP:Envelope>","payload":"<COPC_IN000001UK01 xmlns=\\"urn:hl7-org:v3\\"><id root=\\"FA039330-7E63-446A-8CA4-E9E0D00DA6E8\\"/><ControlActEvent classCode=\\"CACT\\" moodCode=\\"EVN\\"><subject typeCode=\\"SUBJ\\" contextConductionInd=\\"false\\"><hl7:PayloadInformation classCode=\\"OBS\\" moodCode=\\"EVN\\" xmlns:npfitct=\\"template:NPFIT:content\\" xmlns:gp=\\"urn:nhs:names:services:gp2gp\\" xmlns:npfitlc=\\"NPFIT:HL7:Localisation\\" xmlns=\\"urn:hl7-org:v3\\" xmlns:hl7=\\"urn:hl7-org:v3\\"  xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xsi:schemaLocation=\\"urn:hl7-org:v3 ../../Schemas/COPC_MT000001UK01.xsd urn:nhs:names:services:gp2gp ../../Schemas/GP2GP_LM.xsd\\"><value><gp:Gp2gpfragment><gp:Recipients><gp:Recipient>B83002</gp:Recipient></gp:Recipients><gp:From>C81007</gp:From><gp:subject>Continue Acknowledgement</gp:subject></gp:Gp2gpfragment></value></hl7:PayloadInformation></subject></ControlActEvent></COPC_IN000001UK01>"}'

const expectedParsedContinueRequestMessage = {
  interactionId: 'COPC_IN000001UK01',
  conversationId: '6E242658-3D8E-11E3-A7DC-172BDA00FA67',
  odsCode: 'C81007'
}

const validContinueRequestEbXmlAsJson = {
  data: {
    Envelope: {
      Header: {
        MessageHeader:{
          ConversationId: "6E242658-3D8E-11E3-A7DC-172BDA00FA67",
          Action: "COPC_IN000001UK01"
        }
      },
      Body: {
      }
    }
  }
}

const validContinueRequestPayloadAsJson = {
  data: {
    COPC_IN000001UK01: {
      ControlActEvent:{
        classCode:"CACT",
        moodCode:"EVN",
        subject: {
          typeCode:"SUBJ",
          contextConductionInd:"false",
          PayloadInformation: {
            value:{
              Gp2gpfragment:{
                Recipients:{
                  Recipient:"B83002"
                },
                From:"C81007",
                subject:"Continue Acknowledgement"
              }
            }
          }
        }
      }
    }
  }
}

describe('sqs incoming message parser', () => {
  it('should successfully parse a valid ehr-request message', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser
      .mockReturnValueOnce(validEhrRequestEbXmlAsJson)
      .mockReturnValueOnce(validEhrRequestPayloadAsJson);

    let parsedMessage = await parse(rawEhrRequestBody);

    await expect(parsedMessage.interactionId).toBe(expectedParsedEhrRequestMessage.interactionId);
    await expect(parsedMessage.conversationId).toBe(expectedParsedEhrRequestMessage.conversationId);
    await expect(parsedMessage.ehrRequestId).toBe(expectedParsedEhrRequestMessage.ehrRequestId);
    await expect(parsedMessage.nhsNumber).toBe(expectedParsedEhrRequestMessage.nhsNumber);
    await expect(parsedMessage.odsCode).toBe(expectedParsedEhrRequestMessage.odsCode);
  });

  it('should throw if cannot parse json wrapper', async () => {
    jest.spyOn(XmlParser.prototype, 'parse');

    await expect(() => parse('foobar')).rejects.toThrow(/Error parsing/);
  });

  it('should throw if cannot parse ebxml', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser.mockRejectedValue('boom');

    await expect(() => parse({ ebXML: 'notxml' })).rejects.toThrow(/Error parsing/);
  });

  it('should throw if cannot parse as ehr-request message', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser.mockReturnValue({
      data: {
        notWhatYouExpect: true
      }
    });

    await expect(() => parse(rawEhrRequestBody)).rejects.toThrow(/Error parsing/);
  });

  it('should throw if interaction ID is missing', async () => {
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    const ebxmlWithoutInteractionId = JSON.parse(JSON.stringify(validEhrRequestEbXmlAsJson));
    ebxmlWithoutInteractionId.data.Envelope.Header.MessageHeader.Action = undefined;

    xmlParser.mockReturnValueOnce(ebxmlWithoutInteractionId);

    await expect(() => parse(rawEhrRequestBody)).rejects.toThrow(/interaction ID/);
  });

  it('should successfully parse a valid continue-request message', async () => {
    // when
    const xmlParser = jest.spyOn(XmlParser.prototype, 'parse');

    xmlParser
        .mockReturnValueOnce(validContinueRequestEbXmlAsJson)
        .mockReturnValueOnce(validContinueRequestPayloadAsJson);

    const parsedMessage = await parse(rawContinueRequestBody);

    // then
    expect(parsedMessage.interactionId).toBe(expectedParsedContinueRequestMessage.interactionId);
    expect(parsedMessage.conversationId).toBe(expectedParsedContinueRequestMessage.conversationId);
    expect(parsedMessage.odsCode).toBe(expectedParsedContinueRequestMessage.odsCode);
  });
});
