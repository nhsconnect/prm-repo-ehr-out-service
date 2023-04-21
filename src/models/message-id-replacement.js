import { getParameters } from './parameters';

export const modelName = 'MessageIdReplacement';
const tableName = 'message_id_replacement';

const model = dataType => ({
  oldMessageId: {
    field: 'old_message_id',
    type: dataType.UUID,
    primaryKey: true,
    validate: {
      isUUID: 4
    },
    allowNull: false
  },
  newMessageId: {
    field: 'new_message_id',
    type: dataType.UUID,
    validate: {
      isUUID: 4,
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

export default (sequelize, DataTypes) => {
  return sequelize.define(modelName, model(DataTypes), getParameters(tableName));
};
