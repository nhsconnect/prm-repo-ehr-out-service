import { AcknowledgementRecordNotFoundError } from "../../errors/errors";
import { modelName } from '../../models/acknowledgements';
import { logError } from "../../middleware/logging";
import ModelFactory from '../../models';

const Acknowledgement = ModelFactory.getByName(modelName);

export const getAcknowledgementByMessageId = async messageId => {
    const acknowledgement = await Acknowledgement.findByPk(messageId)
        .then(acknowledgement => acknowledgement)
        .catch(error => logError(error));

    if(acknowledgement != null) return acknowledgement;
    else throw new AcknowledgementRecordNotFoundError(messageId);
};