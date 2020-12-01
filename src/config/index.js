import databaseConfig from './database';

export const portNumber = 3000;

export const initializeConfig = () => ({
  nhsEnvironment: process.env.NHS_ENVIRONMENT || 'local',
  repoToGpServiceUrl: process.env.SERVICE_URL,
  repoToGpAuthKeys: process.env.AUTHORIZATION_KEYS,
  gp2gpAdaptorServiceUrl: process.env.GP2GP_ADAPTOR_SERVICE_URL,
  gp2gpAdaptorAuthKeys: process.env.GP2GP_ADAPTOR_AUTHORIZATION_KEYS,
  sequelize: databaseConfig
});
