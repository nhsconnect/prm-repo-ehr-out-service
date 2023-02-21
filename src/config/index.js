import databaseConfig from './database';

export const portNumber = 3000;

export const initializeConfig = () => ({
  nhsEnvironment: process.env.NHS_ENVIRONMENT || 'local',
  repoToGpServiceUrl: process.env.SERVICE_URL || `http://127.0.0.1:${portNumber}`,
  gp2gpMessengerServiceUrl: process.env.GP2GP_MESSENGER_SERVICE_URL,
  gp2gpMessengerAuthKeys: process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS,
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
