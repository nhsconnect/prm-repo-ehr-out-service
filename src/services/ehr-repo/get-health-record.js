import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError } from '../../middleware/logging';

export const getPatientHealthRecordFromRepo = async (nhsNumber, conversationId) => {
  const config = initializeConfig();
  try {
    const url = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;
    const res = await axios.get(url, {
      headers: { Authorization: config.ehrRepoAuthKeys, conversationId: conversationId }
    });
    return { coreEhrMessageUrl: res.data.data.links.healthRecordExtract };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      const errorMessage = 'Cannot find complete patient health record';
      logError(errorMessage, err);
      return null;
    }
    const errorMessage = `Error retrieving health record`;
    logError(errorMessage, err);
    throw err;
  }
};
