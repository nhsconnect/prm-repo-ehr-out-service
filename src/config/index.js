export const portNumber = 3000;

export const initializeConfig = () => ({
  nodeEnv: process.env.NODE_ENV || 'local',
  repoToGpServiceUrl: process.env.SERVICE_URL,
  repoToGpAuthKeys: process.env.AUTHORIZATION_KEYS
});
