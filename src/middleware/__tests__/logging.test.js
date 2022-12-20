import { eventFinished, logDebug, logError, logInfo, logWarning } from '../logging';
import { logger } from '../../config/logging';

jest.mock('../../config/logging');

describe('logging', () => {
  describe('logInfo', () => {
    it('should log with level info', () => {
      logInfo('info');

      expect(logger.info).toBeCalledTimes(1);
    });
  });

  describe('logError', () => {
    it('should log with level error', () => {
      logError('error');

      expect(logger.error).toBeCalledTimes(1);
    });

    it('should actually log the Error object if passed', () => {
      logError('something', new Error('bob'));

      let errorObject = logger.error.mock.calls[0][1];

      expect(errorObject.error).not.toBeNull();
      expect(errorObject.error.message).toEqual('bob');
      expect(errorObject.error.stack).toContain('logging.test');
    });

    it('should log the name of any custom Error object', () => {
      class SomeCustomError extends Error {
        constructor(message) {
          super(message);
          this.name = 'SomeCustomErrorName';
        }
      }

      logError('something', new SomeCustomError('foo'));

      let errorObject = logger.error.mock.calls[0][1];

      expect(errorObject.error.name).toEqual('SomeCustomErrorName');
      expect(errorObject.error.message).toEqual('foo');
    });

    it('should log a non-Error error object literally if passed', () => {
      let notReallyAnError = { message: 'woop', type: 'not really a js error' };
      logError('somesuch', notReallyAnError);

      let errorObject = logger.error.mock.calls[0][1];

      expect(errorObject.error).toEqual(notReallyAnError);
    });
  });

  describe('logWarning', () => {
    it('should log with level warn', () => {
      logWarning('warn');

      expect(logger.warn).toBeCalledTimes(1);
    });
  });

  describe('logDebug', () => {
    it('should log with level debug', () => {
      logDebug('debug');

      expect(logger.debug).toBeCalledTimes(1);
    });
  });

  describe('eventFinished', () => {
    const mockReq = {
      headers: { host: '127.0.0.1:123' },
      method: 'GET',
      originalUrl: '/test/12345'
    };

    it('should log path as log status', () => {
      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK'
      };

      eventFinished(mockReq, mockRes);
      expect(logger.info).toHaveBeenCalledWith(mockReq.originalUrl);
    });

    it('should log with level info if status code is successful', () => {
      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK'
      };

      eventFinished(mockReq, mockRes);
      expect(logger.info).toBeCalledTimes(1);
    });

    it('should log with level error if status code is not successful', () => {
      const mockRes = {
        statusCode: 500,
        statusMessage: 'Internal server error'
      };

      eventFinished(mockReq, mockRes);
      expect(logger.error).toBeCalledTimes(1);
    });
  });
});
