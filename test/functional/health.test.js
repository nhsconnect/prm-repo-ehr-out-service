import axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { config } from '../../src/config';

describe('/health', () => {
  const { repoToGpServiceUrl, nhsEnvironment } = config();
  const healthUrl = `${repoToGpServiceUrl}/health`;

  it('should return 200', async () => {
    const res = await axios.get(healthUrl, { adapter });
    expect(res.status).toEqual(200);
  });

  it('health endpoint returns matching data', async () => {
    const res = await axios.get(healthUrl, { adapter });
    const expectedRes = {
      version: '1',
      description: 'Health of ehr-out-service',
      nhsEnvironment: nhsEnvironment,
      details: {
        database: {
          type: 'postgresql',
          connection: true,
          writable: true
        }
      }
    };

    expect(res.data).toEqual(expectedRes);
  });
});
