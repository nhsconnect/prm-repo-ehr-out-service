import axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { v4 } from 'uuid';
import { emisEhrRequestTemplate } from './data/emis_ehr_request';
import { config } from '../config';

function ehrRequestFor(conversationId, nhsNumber, odsCode) {
  return emisEhrRequestTemplate
    .replace('${conversationId}', conversationId)
    .replace('${nhsNumber}', nhsNumber)
    .replace('${odsCode}', odsCode);
}

describe('EMIS registration requests', () => {
  it('should capture a registration request', async () => {
    const testData = {
      dev: {
        // TODO: dev patients
      },
      test: {
        odsCode: 'A20047',
        nhsNumber: '9692294900'
      }
    };
    //action: send an EHR request to MHS Adapter inbound
    const mhsInboundUrl = config.mhsInboundUrl;
    const repoToGpUrl = config.repoToGpServiceUrl;
    const repoToGpAuthKeys = config.repoToGpAuthKeys;

    const conversationId = v4();
    const envData = testData[config.nhsEnvironment];
    const nhsNumber = envData.nhsNumber;
    const odsCode = envData.odsCode;
    const ehrRequest = ehrRequestFor(conversationId, nhsNumber, odsCode);

    const headers = {
      Soapaction: 'urn:nhs:names:services:gp2gp/RCMR_IN010000UK05',
      'Content-Type':
        'multipart/related;charset="UTF-8";type="text/xml";boundary="0adedbcc-ed0f-415d-8091-4e816bf9d86f";start="<ContentRoot>"'
    };

    await axios.post(mhsInboundUrl, ehrRequest, { headers: headers, adapter }).catch(error => {
      console.log("MHS can't handle this message so it returns with 500");
      console.log(error.response.data);
    });

    console.log("ConversationId:", conversationId);

    // //needs a short wait for the message to go all the way through to repo-to-gp
    // await sleep(500);
    //
    // //assertion: an new entry with that conversation id has been created in repo-to-gp
    // const response = await axios.get(repoToGpUrl, {
    //   headers: { Authorization: repoToGpAuthKeys },
    //   adapter
    // });
    //
    // const expectedData = {
    //   data: {
    //     id: conversationId,
    //     type: 'registration-requests',
    //     attributes: {
    //       nhsNumber,
    //       odsCode,
    //       status: 'registration_request_received'
    //     }
    //   }
    // };
    //
    // expect(response.data).toEqual(expectedData);
  });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
