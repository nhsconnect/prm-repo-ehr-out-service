export const config = {
  nhsEnvironment: process.env.NHS_ENVIRONMENT,
  repoToGpUrl: process.env.REPO_TO_GP_URL,
  localstackEndpointUrl: process.env.LOCALSTACK_URL,
  region: process.env.AWS_DEFAULT_REGION || 'eu-west-2',
  awsAccountNo: '000000000000',
  SQS_EHR_OUT_INCOMING_QUEUE_URL: 'test-ehr-out-service-incoming'
};

export const initialiseConfig = () => {
  process.env.SQS_EHR_OUT_INCOMING_QUEUE_URL = config.SQS_EHR_OUT_INCOMING_QUEUE_URL;
};
