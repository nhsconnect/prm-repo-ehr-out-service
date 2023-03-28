import axios from "axios";
import { config } from "../../config";
import { logError } from "../../middleware/logging";

// TODO [PRMT-2728] DEPRECATED - remove this & any associated test class
export const getPatientHealthRecordFromRepo = async (nhsNumber, conversationId) => {
  const {ehrRepoAuthKeys, ehrRepoServiceUrl} = config();
  try {
    const url = `${ehrRepoServiceUrl}/patients/${nhsNumber}`;
    const res = await axios.get(url, {
      headers: { Authorization: ehrRepoAuthKeys, conversationId: conversationId }
    });
    return { coreMessageUrl: res.data.coreMessageUrl };
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
