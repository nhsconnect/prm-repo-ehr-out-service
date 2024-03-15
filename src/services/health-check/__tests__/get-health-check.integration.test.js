import { getHealthCheck } from '../get-health-check';
import ModelFactory from '../../../models';
import { config } from '../../../config';

describe.skip('getHealthCheck', () => {
  const { nhsEnvironment } = config();
  beforeEach(() => {
    ModelFactory._resetConfig();
  });

  afterAll(() => {
    ModelFactory.sequelize.close();
  });

  it('should return static health check object', async () => {
    const expected = {
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

    const actual = await getHealthCheck();

    expect(actual).toStrictEqual(expected);
  });

  it('should return failed db health check if username is incorrect', () => {
    ModelFactory._overrideConfig('username', 'wrong-username');

    return getHealthCheck().then(result => {
      const db = result.details.database;

      return expect(db).toEqual({
        type: 'postgresql',
        connection: true,
        writable: false,
        error: 'Authorization error (Error Code: 28P01)'
      });
    });
  });

  it('should return failed db health check if password is incorrect', () => {
    ModelFactory._overrideConfig('password', 'wrong-password');

    return getHealthCheck().then(result => {
      const db = result.details.database;

      return expect(db).toEqual({
        type: 'postgresql',
        connection: true,
        writable: false,
        error: 'Authorization error (Error Code: 28P01)'
      });
    });
  });

  it('should return failed db health check if there is an unknown error', () => {
    ModelFactory._overrideConfig('host', 'something');

    return getHealthCheck().then(result => {
      const db = result.details.database;

      return expect(db).toEqual({
        type: 'postgresql',
        connection: false,
        writable: false,
        error: 'Unknown error (Error Code: ENOTFOUND)'
      });
    });
  });
});
