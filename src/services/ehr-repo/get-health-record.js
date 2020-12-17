import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError } from '../../middleware/logging';

export const getPatientHealthRecordFromRepo = async nhsNumber => {
  const config = initializeConfig();
  const url = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;
  try {
    const res = await axios.get(url, { headers: { Authorization: config.ehrRepoAuthKeys } });
    return res.data.data.links;
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
