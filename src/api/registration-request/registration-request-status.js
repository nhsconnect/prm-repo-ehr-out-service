import { param } from 'express-validator';
import { getRegistrationRequestByConversationId } from '../../services/database/registration-request-repository';
import { logError, logInfo } from '../../middleware/logging';
import { setCurrentSpanAttributes } from '../../config/tracing';

export const registrationRequestStatusValidationRules = [
  param('conversationId').isUUID().withMessage("'conversationId' provided is not of type UUID"),
  param('conversationId').not().isEmpty().withMessage(`'conversationId' has not been provided`)
];

export const registrationRequestStatus = async (req, res) => {
  try {
    setCurrentSpanAttributes({ conversationId: req.params.conversationId });
    const registrationRequest = await getRegistrationRequestByConversationId(req.params.conversationId);

    if (registrationRequest === null) {
      logInfo('Registration not found');
      return res.sendStatus(404);
    }

    const { conversationId, nhsNumber, odsCode, status } = registrationRequest;

    const data = {
      data: {
        type: 'registration-requests',
        id: conversationId,
        attributes: {
          nhsNumber,
          odsCode,
          status
        }
      }
    };

    res.status(200).json(data);
  } catch (err) {
    logError('Registration request status call failed', err);
    res.sendStatus(503);
  }
};
