import { initializeConfig } from '..';

describe('config', () => {
  let serviceUrl;

  beforeEach(() => {
    serviceUrl = process.env.SERVICE_URL;
  });

  afterEach(() => {
    process.env.SERVICE_URL = serviceUrl;
  });

  it('service url defaults to the correct value when environment variables not set', () => {
    if (process.env.SERVICE_URL) delete process.env.SERVICE_URL;
    expect(initializeConfig().repoToGpServiceUrl).toEqual(`http://127.0.0.1:3000`);
  });

  it('service url is the correct value when environment variables are set', () => {
    process.env.SERVICE_URL = 'url';
    expect(initializeConfig().repoToGpServiceUrl).toEqual(`url`);
  });

  it('nhs Environment is the correct value when environment variables are set', () => {
    process.env.NHS_ENVIRONMENT = 'local';
    expect(initializeConfig().nhsEnvironment).toEqual('local');
  });
});
