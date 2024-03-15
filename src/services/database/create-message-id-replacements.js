import { runWithinTransaction } from './helper';
import { logError, logInfo } from '../../middleware/logging';
import ModelFactory from '../../models';
import { modelName } from '../../models/message-id-replacement';
import { errorMessages } from '../../errors/errors';

const MessageIdReplacement = ModelFactory.getByName(modelName);

const createMessageIdReplacements = async messageIdReplacements =>
  /**
   * @deprecated
   * to be replaced by new method `storeOutboundMessageIds`
   * to be deleted in PRMT-4588
   */
  runWithinTransaction(transaction =>
    MessageIdReplacement.bulkCreate(messageIdReplacements, { transaction: transaction })
      .then(() => logInfo('Recorded new message IDs in database'))
      .catch(error => {
        logError(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
        throw error;
      })
  );
