import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError, logEvent } from '../../middleware/logging';

export const sendEhrExtract = async (conversationId, odsCode, ehrRequestId, currentEhrUrl) => {
  const config = initializeConfig();
  const url = `${config.gp2gpAdaptorServiceUrl}/health-record-transfers`;
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
  }

  try {
    await axios.post(url, requestBody, { headers: { Authorization: config.gp2gpAdaptorAuthKeys } });
    logEvent('Successfully sent ehr', { conversationId })
  } catch (err) {
    logError('Failed while trying to send ehr', err);
    throw err;
  }
}