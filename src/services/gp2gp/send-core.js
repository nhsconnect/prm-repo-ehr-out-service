import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError, logInfo } from '../../middleware/logging';

export const sendCore = async (conversationId, odsCode, coreEhr, ehrRequestId) => {
  const config = initializeConfig();
  const url = `${config.gp2gpMessengerServiceUrl}/ehr-out-transfers/core`;

  const requestBody = {
    conversationId: conversationId,
    odsCode: odsCode,
    coreEhr: coreEhr,
    ehrRequestId: ehrRequestId
  };


  // const requestBody = {
  //   data: {
  //     type: 'health-record-transfers',
  //     id: conversationId,
  //     attributes: {
  //       odsCode,
  //       ehrRequestId
  //     },
  //     links: {
  //       currentEhrUrl
  //     }
  //   }
  // };

  try {
    await axios.post(url, requestBody, { headers: { Authorization: config.gp2gpMessengerAuthKeys } });
    logInfo('Successfully sent ehr');
  } catch (err) {
    logError('Failed while trying to send ehr', err);
    throw err;
  }
};
