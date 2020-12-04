import axios from 'axios';
import { initializeConfig } from '../../config';
import { logError, logEvent } from '../../middleware/logging';

export const getPdsPatientDetails = async nhsNumber => {
  const config = initializeConfig();
  const url = `${config.gp2gpAdaptorServiceUrl}/patient-demographics/${nhsNumber}`;
  try {
    const res = await axios.get(url, { headers: { Authorization: config.gp2gpAdaptorAuthKeys } });
    logEvent('Successfully retrieved patient from PDS', {
      nhsNumber,
      odsCode: res.data.data.odsCode
    });
    return res;
  } catch (err) {
    const errorMessage = 'Unable to retrieve patient from PDS';
    logError(errorMessage, err);
    throw errorMessage;
  }
};
