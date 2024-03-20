import { getParameters } from './parameters';

/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
const modelName = 'MessageIdReplacement';
const tableName = 'message_id_replacement';

const model = dataType => ({
  oldMessageId: {
    field: 'old_message_id',
    type: dataType.UUID,
    primaryKey: true,
    allowNull: false
  },
  newMessageId: {
    field: 'new_message_id',
    type: dataType.UUID,
    validate: {
      isUppercase: true
    },
    allowNull: false
  },
  createdAt: {
    field: 'created_at',
    type: dataType.DATE,
    allowNull: false
  },
  updatedAt: {
    field: 'updated_at',
    type: dataType.DATE,
    allowNull: false
  },
  deletedAt: {
    field: 'deleted_at',
    type: dataType.DATE
  }
});

// export default (sequelize, DataTypes) => {
//   return sequelize.define(modelName, model(DataTypes), getParameters(tableName));
// };
