import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError } from '../../middleware/logging';

export const getPatientHealthRecordFromRepo = async nhsNumber => {
  const config = initializeConfig();
  try {
    if (config.useNewEhrRepoApi) {
      const url = `${config.ehrRepoServiceUrl}/new/patients/${nhsNumber}`;
      const res = await axios.get(url, { headers: { Authorization: config.ehrRepoAuthKeys } });
      return { currentEhr: res.data.data.links.healthRecordExtract };
    } else {
      const url = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;
      const res = await axios.get(url, { headers: { Authorization: config.ehrRepoAuthKeys } });
      return res.data.data.links;
    }
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
