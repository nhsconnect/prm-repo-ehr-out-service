import { initializeConfig } from '../config';
import { checkDbHealth } from './database/check-db-health';

export const getHealthCheck = async () => {
  const config = initializeConfig();
  const dbHealthCheck = await checkDbHealth();

  return {
    version: '1',
    description: 'Health of Repo To GP service',
    nhsEnvironment: config.nhsEnvironment,
    details: {
      database: dbHealthCheck
    }
  };
};
