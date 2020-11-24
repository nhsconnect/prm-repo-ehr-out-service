import express from 'express';
import { getHealthCheck } from '../services/get-health-check';

export const healthCheck = express.Router();

healthCheck.get('/', (req, res) => {
  const status = getHealthCheck();

  res.status(200).json(status);
});
