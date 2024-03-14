import { checkDbHealth } from '../check-db-health';
import ModelFactory from '../../../models';

/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
describe.skip('db', () => {
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
