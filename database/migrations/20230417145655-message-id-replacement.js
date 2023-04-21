'use strict';

const tableName = 'message_id_replacement';

const model = dataType => {
  return {
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