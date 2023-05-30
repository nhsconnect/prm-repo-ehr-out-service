import ModelFactory from "../../models";
import { modelName } from "../../models/acknowledgement";
import { runWithinTransaction } from "./helper";
import { logError, logInfo } from "../../middleware/logging";

const Acknowledgement = ModelFactory.getByName(modelName);

export const createAcknowledgement = (messageId, conversationId, service, ackTypeCode, ackDetail, failureReason) =>
  runWithinTransaction(transaction =>
    Acknowledgement.create(
      {
        messageId,
        conversationId,
        service,
        ackTypeCode,
        ackDetail,
        failureReason
      },
      transaction
    )
      .then(() => logInfo('Acknowledgement has been created in the database'))
      .catch(error => logError(error))
  );