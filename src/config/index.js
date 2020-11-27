import databaseConfig from './database';

export const portNumber = 3000;

export const initializeConfig = () => ({
  nhsEnvironment: process.env.NHS_ENVIRONMENT || 'local',
  repoToGpServiceUrl: process.env.SERVICE_URL,
  repoToGpAuthKeys: process.env.AUTHORIZATION_KEYS,
  sequelize: databaseConfig
});
