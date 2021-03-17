import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError, logInfo } from '../../middleware/logging';

export const getPdsOdsCode = async nhsNumber => {
  const config = initializeConfig();
  const url = `${config.gp2gpAdaptorServiceUrl}/patient-demographics/${nhsNumber}`;
  try {
    const res = await axios.get(url, { headers: { Authorization: config.gp2gpAdaptorAuthKeys } });
    logInfo('Successfully retrieved patient from PDS');

    return res.data.data.odsCode;
  } catch (err) {
    const errorMessage = 'Unable to retrieve patient from PDS';
    logError(errorMessage, err);
    throw errorMessage;
  }
};
