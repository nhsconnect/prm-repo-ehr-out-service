import { runWithinTransaction } from './helper';
import { logError, logInfo } from "../../middleware/logging";
import ModelFactory from '../../models';
import { modelName } from '../../models/message-id-replacement';
import {errorMessages} from "../../errors/errors";
import {v4 as uuidv4} from "uuid";

const MessageIdReplacement = ModelFactory.getByName(modelName);

// TODO PRMT-4074 remove this
// export const createMessageIdReplacement = (oldMessageId, newMessageId) =>
//   runWithinTransaction(transaction =>
//     MessageIdReplacement.create(
//       {
//         oldMessageId,
//         newMessageId,
//       },
//       { transaction: transaction }
//     )
//       .then(() => logInfo(`Recorded a pair of message id mapping: {inbound: ${oldMessageId}, outbound: ${newMessageId}}`))
//       .catch(error => {
//         logError(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
//         throw error
//       })
//   );

export const createMessageIdReplacements = (messageIdReplacements) =>
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