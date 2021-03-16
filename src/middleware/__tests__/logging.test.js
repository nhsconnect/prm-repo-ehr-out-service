import {
  eventFinished,
  extractConversationId,
  logDebug,
  logError,
  logInfo,
  logWarning
} from '../logging';
import { logger } from '../../config/logging';
import { v4 as uuid } from 'uuid';

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

  describe('extract conversationId', () => {
    const conversationId = uuid();

    it('should work for GET requests from registration-requests urls', () => {
      const mockGetReq = {
        headers: { host: '127.0.0.1:123' },
        method: 'GET',
        url: `registration-requests/${conversationId}`
      };

      expect(extractConversationId(mockGetReq)).toBe(conversationId);
    });

    it('should not work for non-registration urls', () => {
      const mockGetReq = {
        headers: { host: '127.0.0.1:123' },
        method: 'GET',
        url: `test/${conversationId}`
      };

      expect(extractConversationId(mockGetReq)).not.toBe(conversationId);
    });

    it('should work for POST requests', () => {
      const mockPostReq = {
        headers: { host: '127.0.0.1:123' },
        method: 'POST',
        body: {
          data: {
            id: conversationId
          }
        }
      };

      expect(extractConversationId(mockPostReq)).toBe(conversationId);
    });
  });
});
