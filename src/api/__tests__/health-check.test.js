import app from '../../app';
import request from 'supertest';
import { getHealthCheck } from '../../services/get-health-check';
import { logEvent, logError } from '../../middleware/logging';

jest.mock('../../middleware/logging', () => ({
  logEvent: jest.fn(),
  logError: jest.fn(),
  middleware: (req, res, next) => next()
}));
jest.mock('../../services/get-health-check');

describe('GET /health', () => {
  it('should return HTTP status code 200', async () => {
    getHealthCheck.mockResolvedValue(expectedHealthCheckBase());
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expectedHealthCheckBase());
    expect(logEvent).toHaveBeenCalledWith('Health check completed');
  });

  it('should return 503 status if db writable is false', async () => {
    getHealthCheck.mockResolvedValue(expectedHealthCheckBase(false, true));
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual(expectedHealthCheckBase(false, true));
    expect(logError).toHaveBeenCalledWith(
      'Health check failed',
      expectedHealthCheckBase(false, true)
    );
  });

  it('should return 500 if getHealthCheck if it cannot provide a health check', async () => {
    getHealthCheck.mockRejectedValue('some-error');
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(500);
    expect(logEvent).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('Health check error', 'some-error');
  });
});

const expectedHealthCheckBase = (db_writable = true, db_connected = true) => ({
  details: {
    database: getExpectedDatabase(db_writable, db_connected)
  }
});

const getExpectedDatabase = (isWritable, isConnected) => {
  const baseConf = {
    connection: isConnected,
    writable: isWritable
  };

  return !isWritable
    ? {
        ...baseConf,
        error: 'some-error'
      }
    : baseConf;
};
