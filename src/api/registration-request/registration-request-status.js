import { param } from 'express-validator';
import { getRegistrationRequestStatusByConversationId } from '../../services/database/registration-request-repository';
import { logError } from '../../middleware/logging';

export const registrationRequestStatusValidationRules = [
  param('conversationId')
    .isUUID('4')
    .withMessage("'conversationId' provided is not of type UUIDv4"),
  param('conversationId').not().isEmpty().withMessage(`'conversationId' has not been provided`)
];

export const registrationRequestStatus = async (req, res) => {
  try {
    const registrationRequestStatus = await getRegistrationRequestStatusByConversationId(
      req.params.conversationId
    );

    if (registrationRequestStatus === null) return res.sendStatus(404);

    const data = {
      data: {
        type: 'registration-requests',
        id: req.params.conversationId,
        attributes: {
          nhsNumber: registrationRequestStatus.nhsNumber,
          odsCode: registrationRequestStatus.odsCode
        }
      }
    };
    res.status(200).json(data);
  } catch (err) {
    logError('Registration request status call failed', err);
    res.sendStatus(503);
  }
};
