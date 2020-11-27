import axios from 'axios';
import adapter from 'axios/lib/adapters/http';

describe('/health', () => {
  const healthUrl = `${process.env.SERVICE_URL}/health`;

  it('should return 200', async () => {
    const res = await axios.get(healthUrl, { adapter });
    expect(res.status).toEqual(200);
  });

  it('health endpoint returns matching data', async () => {
    const res = await axios.get(healthUrl, { adapter });

    expect(res.data).toEqual(
      expect.objectContaining({
        version: '1',
        description: 'Health of Repo To GP service',
        nhsEnvironment: 'dev'
      })
    );
  });
});
