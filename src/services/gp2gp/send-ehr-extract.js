import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError, logInfo } from '../../middleware/logging';

export const sendEhrExtract = async (conversationId, odsCode, ehrRequestId, currentEhrUrl) => {
  const config = initializeConfig();
  const url = `${config.gp2gpMessengerServiceUrl}/health-record-transfers`;
  const requestBody = {
    data: {
      type: 'health-record-transfers',
      id: conversationId,
      attributes: {
        odsCode,
        ehrRequestId
      },
      links: {
        currentEhrUrl
      }
    }
  };

  try {
    await axios.post(url, requestBody, { headers: { Authorization: config.gp2gpMessengerAuthKeys } });
    logInfo(`Successfully sent ehr with conversationId: ${conversationId}`);
  } catch (err) {
    logError('Failed while trying to send ehr', err);
    throw err;
  }
};
