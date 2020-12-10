import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError } from '../../middleware/logging';

export const getPatientHealthRecordFromRepo = async nhsNumber => {
  const config = initializeConfig();
  const url = `${config.ehrRepoServiceUrl}/patients/${nhsNumber}`;
  try {
    const res = await axios.get(url, { headers: { Authorization: config.ehrRepoAuthKeys } });
    return res.status === 200;
  } catch (err) {
    const errorMessage = 'Cannot find complete patient health record';
    logError(errorMessage, err);
    return false;
  }
};
