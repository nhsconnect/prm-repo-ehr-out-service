import { AcknowledgementRecordNotFoundError } from '../../errors/errors';
import { modelName } from '../../models/acknowledgements';
import { logError } from '../../middleware/logging';
import ModelFactory from '../../models';

const Acknowledgement = ModelFactory.getByName(modelName);

const getAcknowledgementByMessageId = async messageId => {
  /**
   * @deprecated
   * to be deleted in PRMT-4588
   *
   * No replacement method intended, as no usage was found except for test
   * In dynamodb we will store acknowledgement record at Fragment level,
   * so if we need to retrieve store acknowledgement by messageId, we can querying the Fragment
   */
  const acknowledgement = await Acknowledgement.findByPk(messageId)
    .then(acknowledgement => acknowledgement)
    .catch(error => logError(error));

  if (acknowledgement != null) return acknowledgement;
  else throw new AcknowledgementRecordNotFoundError(messageId);
};
