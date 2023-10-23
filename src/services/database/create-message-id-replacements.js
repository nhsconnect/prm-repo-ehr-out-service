import { runWithinTransaction } from './helper';
import { logError, logInfo } from "../../middleware/logging";
import ModelFactory from '../../models';
import { modelName } from '../../models/message-id-replacement';
import { errorMessages } from "../../errors/errors";

const MessageIdReplacement = ModelFactory.getByName(modelName);

export const createMessageIdReplacements = async (messageIdReplacements) =>
  runWithinTransaction(transaction =>
    MessageIdReplacement.bulkCreate(
      messageIdReplacements,
      { transaction: transaction })
      .then(() => logInfo('Recorded new message IDs in database'))
      .catch(error => {
        logError(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
        throw error
      })
  );