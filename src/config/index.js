import databaseConfig from './database';

export const portNumber = 3000;

export const initializeConfig = () => ({
  nhsEnvironment: process.env.NHS_ENVIRONMENT || 'local',
  repoToGpServiceUrl: process.env.SERVICE_URL || `http://127.0.0.1:${portNumber}`,
  repoToGpAuthKeys: process.env.AUTHORIZATION_KEYS,
  gp2gpAdaptorServiceUrl: process.env.GP2GP_ADAPTOR_SERVICE_URL,
  gp2gpAdaptorAuthKeys: process.env.GP2GP_ADAPTOR_AUTHORIZATION_KEYS,
  ehrRepoServiceUrl: process.env.EHR_REPO_SERVICE_URL,
  ehrRepoAuthKeys: process.env.EHR_REPO_AUTHORIZATION_KEYS,
  sequelize: databaseConfig,
  consumerApiKeys: loadConsumerKeys()
});

const loadConsumerKeys = () => {
  const consumerObjectKeys = {};
  Object.keys(process.env).forEach(envVarName => {
    if (envVarName.startsWith('API_KEY_FOR_')) {
      const consumerName = envVarName.split('API_KEY_FOR_')[1];
      consumerObjectKeys[consumerName] = process.env[envVarName];
    }
  });
  return consumerObjectKeys;
};
