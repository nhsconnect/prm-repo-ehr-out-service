import express from 'express';
import { getHealthCheck } from '../services/get-health-check';
import { logEvent, logError } from '../middleware/logging';

export const healthCheck = express.Router();

healthCheck.get('/', async (req, res, next) => {
  try {
    const status = await getHealthCheck();

    if (status.details.database.writable) {
      logEvent('Health check completed');
      res.status(200).json(status);
    } else {
      logError('Health check failed', status);
      res.status(503).json(status);
    }
  } catch (err) {
    logError('Health check error', err);
    next(err);
  }
});
