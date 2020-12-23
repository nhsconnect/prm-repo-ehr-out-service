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
  const RETRY_COUNT = 20;
  const POLLING_INTERVAL_MS = 500;
  const TEST_TIMEOUT = 3 * RETRY_COUNT * POLLING_INTERVAL_MS;

  it(
    'should capture a registration request',
    async () => {
      const testData = {
        dev: {
          odsCode: 'A91720',
          nhsNumber: '9692842304'
        },
        test: {
          odsCode: 'A20047',
          nhsNumber: '9692294900'
        }
      };
      //action: send an EHR request to MHS Adapter inbound
      const mhsInboundUrl = config.mhsInboundUrl;

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
        console.log(error.response);
      });

      console.log('ConversationId:', conversationId);

      let registrationStatus;
      const expectedStatus = 'sent_ehr';
      for (let i = 0; i < RETRY_COUNT; i++) {
        const registrationDetails = await getRegistrationDetails(conversationId);
        registrationStatus = registrationDetails.status;
        console.log(`try: ${i} - status: ${registrationStatus}`);
        if (registrationStatus === expectedStatus) {
          break;
        }
        await sleep(POLLING_INTERVAL_MS);
      }

      expect(registrationStatus).toEqual(expectedStatus);
    },
    TEST_TIMEOUT
  );
});

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getRegistrationDetails = async conversationId => {
  const repoToGpUrl = `https://${config.nhsEnvironment}.repo-to-gp.patient-deductions.nhs.uk`;
  const repoToGpAuthKeys = config.repoToGpAuthKeys;
  const registrationDetailsResp = await axios.get(
    `${repoToGpUrl}/registration-requests/${conversationId}`,
    {
      headers: { Authorization: repoToGpAuthKeys },
      adapter
    }
  );
  if (registrationDetailsResp.status !== 200) {
    return {};
  }
  return registrationDetailsResp.data.data.attributes;
};
