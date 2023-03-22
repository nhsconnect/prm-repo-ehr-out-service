import ModelFactory from '../../models';
import { modelName } from '../../models/fragments-trace';
import { runWithinTransaction } from './helper';
import { logInfo, logWarning } from "../../middleware/logging";

const FragmentsTrace = ModelFactory.getByName(modelName);

export const getFragmentsTraceStatusByMessageId = async messageId => {
  // const foundFragmentsTrace = await FragmentsTrace.findByPk(messageId);
  // if (foundFragmentsTrace) {
  //   return foundFragmentsTrace
  // } else {
  //   // throw an error
  // }

  return FragmentsTrace.findByPk(messageId);
};

export const updateFragmentsTraceStatus = async (messageId, status) => {
  logInfo(`Updating fragment trace status to ${status}`);
  await runWithinTransaction(async transaction => {
    return await FragmentsTrace.update(
      { status },
      {
        where: { message_id: messageId },
        transaction
      }
    );
  });
};
