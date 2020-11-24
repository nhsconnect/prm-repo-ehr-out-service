import { body } from 'express-validator';

export const registrationRequestValidationRules = [
  body('nhsNumber').isNumeric().withMessage("'nhsNumber' provided is not numeric"),
  body('nhsNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage("'nhsNumber' provided is not 10 characters"),
  body('odsCode').notEmpty(),
  body('conversationId').isUUID('4').withMessage("'conversationId' provided is not of type UUIDv4")
];

export const registrationRequest = async (req, res) => {
  res.sendStatus(201);
};
