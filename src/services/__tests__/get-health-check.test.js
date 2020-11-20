import { initializeConfig } from '../../config';
import { getHealthCheck } from '../get-health-check';

jest.mock('../../config');

describe('getHealthCheck', () => {
  it('should return static health check object', () => {
    const expected = {
      version: '1',
      description: 'Health of Repo To GP service',
      nodeEnv: 'local',
    };

    initializeConfig.mockReturnValue({ nodeEnv: 'local' });

    expect(getHealthCheck()).toStrictEqual(expected);
  });
});