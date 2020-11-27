'use strict';

const tableName = 'health_checks';

const model = dataType => {
  return {
    id: {
      field: 'id',
      type: dataType.UUID,
      primaryKey: true
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
  down: (queryInterface) => {
    return queryInterface.dropTable(tableName);
  }
};
