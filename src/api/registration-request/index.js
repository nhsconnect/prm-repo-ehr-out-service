import express from 'express';
import { authenticateRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { registrationRequest, registrationRequestValidationRules } from './registration-request';

export const registrationRequests = express.Router();

registrationRequests.post(
  '/',
  authenticateRequest,
  registrationRequestValidationRules,
  validate,
  registrationRequest
);
