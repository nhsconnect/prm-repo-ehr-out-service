/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
'use strict';

const tableName = 'message_id_replacement';

const model = dataType => {
  return {
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
  };
};

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, model(Sequelize));
  },
  down: queryInterface => {
    return queryInterface.dropTable(tableName);
  }
};
