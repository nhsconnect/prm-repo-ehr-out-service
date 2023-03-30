import { config } from '../../config';
import { checkDbHealth } from '../database/check-db-health';

export const getHealthCheck = async () => {
  const { nhsEnvironment } = config();
  const dbHealthCheck = await checkDbHealth();

  return {
    version: '1',
    description: 'Health of ehr-out-service',
    nhsEnvironment: nhsEnvironment,
    details: {
      database: dbHealthCheck
    }
  };
};
