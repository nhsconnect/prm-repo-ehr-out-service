import { runWithinTransaction } from './helper';
import { logError, logInfo } from "../../middleware/logging";
import ModelFactory from '../../models';
import { modelName } from '../../models/acknowledgements';

const Acknowledgement = ModelFactory.getByName(modelName);

export const createAcknowledgement = (parsedAcknowledgementMessage) =>
  /**
   * @deprecated
   * replaced by new method `storeAcknowledgement`
   * to be deleted in PRMT-4588
   */
    runWithinTransaction(transaction =>
        Acknowledgement.create(
            {
                messageId: parsedAcknowledgementMessage.messageId,
                acknowledgementTypeCode: parsedAcknowledgementMessage.acknowledgementTypeCode,
                acknowledgementDetail: parsedAcknowledgementMessage.acknowledgementDetail,
                service: parsedAcknowledgementMessage.service,
                referencedMessageId: parsedAcknowledgementMessage.referencedMessageId,
                messageRef: parsedAcknowledgementMessage.messageRef
            },
            { transaction: transaction }
        )
            .then(() => logInfo('Acknowledgement has been stored'))
            .catch(error => logError(error))
    );