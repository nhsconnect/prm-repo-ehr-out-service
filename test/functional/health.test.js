import axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { initializeConfig } from '../../src/config';

describe('/health', () => {
  const config = initializeConfig();
  const healthUrl = `${config.repoToGpServiceUrl}/health`;

  it('should return 200', () => {
    return expect(
      axios.get(healthUrl, {
        adapter
      })
    ).resolves.toEqual(expect.objectContaining({ status: 200 }));
  });

  it('health endpoint returns matching data', async () => {
    return expect(
      axios.get(healthUrl, {
        adapter
      })
    ).resolves.toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          version: '1',
          description: 'Health of Repo To GP service',
          nodeEnv: config.nodeEnv
        })
      })
    );
  });
});
