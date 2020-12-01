import express from 'express';
import { authenticateRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { registrationRequest, registrationRequestValidationRules } from './registration-request';
import {
  registrationRequestStatus,
  registrationRequestStatusValidationRules
} from './registration-request-status';

export const registrationRequests = express.Router();

registrationRequests.post(
  '/',
  authenticateRequest,
  registrationRequestValidationRules,
  validate,
  registrationRequest
);

registrationRequests.get(
  '/:conversationId',
  authenticateRequest,
  registrationRequestStatusValidationRules,
  validate,
  registrationRequestStatus
);
