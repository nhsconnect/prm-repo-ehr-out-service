import { ERROR_CODES } from "../../constants/postgres-error-codes";
import { modelName } from '../../models/health-check';
import ModelFactory from '../../models';

export const checkDbHealth = async () => {
  const HealthCheck = ModelFactory.getByName(modelName);

  try {
    await HealthCheck.create();

    return {
      type: 'postgresql',
      connection: true,
      writable: true
    };
  } catch (err) {
    if (err.parent && err.parent.code) {
      return parseHealthCheckError(err.parent.code);
    }

    return {
      type: 'postgresql',
      connection: false,
      writable: false,
      error: `Sequelize error (Message: ${err})`
    };
  }
};

const parseHealthCheckError = code => {
  switch (code) {
    case ERROR_CODES.INVALID_USER_PASSWORD:
    case ERROR_CODES.INVALID_CREDENTIALS:
      return {
        type: 'postgresql',
        connection: true,
        writable: false,
        error: `Authorization error (Error Code: ${code})`
      };
    case ERROR_CODES.CONNECTION_REFUSED:
    case ERROR_CODES.INVALID_DATABASE:
      return {
        type: 'postgresql',
        connection: false,
        writable: false,
        error: `Connection error (Error Code: ${code})`
      };
    default:
      return {
        type: 'postgresql',
        connection: false,
        writable: false,
        error: `Unknown error (Error Code: ${code})`
      };
  }
};
