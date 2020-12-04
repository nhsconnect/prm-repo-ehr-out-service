import axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { v4 } from 'uuid';
import { emisEhrRequestTemplate } from './data/emis_ehr_request';

function ehrRequestFor(conversationId, nhsNumber, odsCode) {
  return emisEhrRequestTemplate
    .replace('${conversationId}', conversationId)
    .replace('${nhsNumber}', nhsNumber)
    .replace('${odsCode}', odsCode);
}

describe('Smoke tests for registration requests', () => {
  it('should capture a registration request', async () => {
    //action: send an EHR request to MHS Adapter inbound
    const mhsInboundUrl = process.env.MHS_INBOUND_URL;
    const repoToGpUrl = process.env.SERVICE_URL;
    const repoToGpAuthKeys = process.env.AUTHORIZATION_KEYS;

    const conversationId = v4();
    const nhsNumber = '1234567890';
    const odsCode = 'A12345';
    const ehrRequest = ehrRequestFor(conversationId, nhsNumber, odsCode);

    await axios.post(mhsInboundUrl, ehrRequest, { adapter });

    //needs a short wait for the message to go all the way through to repo-to-gp
    await sleep(500);

    //assertion: an new entry with that conversation id has been created in repo-to-gp
    const response = await axios.get(repoToGpUrl, {
      headers: { Authorization: repoToGpAuthKeys },
      adapter
    });

    const expectedData = {
      data: {
        id: conversationId,
        type: 'registration-requests',
        attributes: {
          nhsNumber,
          odsCode,
          status: 'registration_request_received'
        }
      }
    };

    expect(response.data).toEqual(expectedData);
  });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
