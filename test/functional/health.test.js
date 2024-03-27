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
});
