import express from 'express';
import { validate } from '../../middleware/validation';
import { registrationRequest, registrationRequestValidationRules } from './registration-request';

export const registrationRequests = express.Router();

registrationRequests.post('/', registrationRequestValidationRules, validate, registrationRequest);
