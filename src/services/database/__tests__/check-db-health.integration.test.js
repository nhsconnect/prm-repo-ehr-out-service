import { checkDbHealth } from '../check-db-health';
import ModelFactory from '../../../models';

describe('db', () => {
  afterAll(() => {
    ModelFactory.sequelize.close();
  });

  it('should return the db health', async () => {
    const result = await checkDbHealth();

    expect(result).toEqual({
      type: 'postgresql',
      connection: true,
      writable: true
    });
  });
});
