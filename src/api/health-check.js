import express from 'express';
import { getHealthCheck } from '../services/get-health-check';

const router = express.Router();

router.get('/', (req, res, next) => {
  const status = getHealthCheck();

  res.status(200).json(status);
});

export default router;
