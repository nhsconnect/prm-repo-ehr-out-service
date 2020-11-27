import { initializeConfig } from '../config';

export const getHealthCheck = () => {
  const config = initializeConfig();

  return {
    version: '1',
    description: 'Health of Repo To GP service',
    nhsEnvironment: config.nhsEnvironment
  };
};
