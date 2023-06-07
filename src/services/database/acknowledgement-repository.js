import ModelFactory from '../../models';
import { modelName } from '../../models/message-fragment';
import { AcknowledgementRecordNotFoundError } from "../../errors/errors";

const Acknowledgement = ModelFactory.getByName(modelName);

export const getAcknowledgementByMessageId = messageId => {
    return Acknowledgement.findByPk(messageId)
        .then(acknowledgement => acknowledgement)
        .catch(error => {
            throw new AcknowledgementRecordNotFoundError(messageId);
        });
};