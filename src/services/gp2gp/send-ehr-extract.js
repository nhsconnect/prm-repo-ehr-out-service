import axios from 'axios';
import { config } from '../../config';
import { logError, logInfo } from '../../middleware/logging';

// TODO [PRMT-2728] DEPRECATED

export const sendEhrExtract = async (conversationId, odsCode, ehrRequestId, currentEhrUrl) => {
  const { gp2gpMessengerServiceUrl, gp2gpMessengerAuthKeys } = config();
  const url = `${gp2gpMessengerServiceUrl}/health-record-transfers`;
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
    await axios.post(url, requestBody, { headers: { Authorization: gp2gpMessengerAuthKeys } });
    logInfo(`Successfully sent ehr with conversationId: ${conversationId}`);
  } catch (err) {
    logError('Failed while trying to send ehr', err);
    throw err;
  }
};
