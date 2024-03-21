/**
 * @deprecated
 * to be deleted in PRMT-4588
 */

import ModelFactory from '../../models';
import { logError } from '../../middleware/logging';

const sequelize = ModelFactory.sequelize;

const runWithinTransaction = async dbInteractionLambda => {
  const transaction = await sequelize.transaction();
  try {
    const response = await dbInteractionLambda(transaction);
    await transaction.commit();
    return response;
  } catch (err) {
    logError(err);
    await transaction.rollback();
    throw err;
  }
};
