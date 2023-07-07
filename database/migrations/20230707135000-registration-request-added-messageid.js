'use strict';

const tableName = 'registration_requests';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(transaction => {
      return queryInterface.addColumn(tableName, 'message_id', {
          type: Sequelize.DataTypes.UUID,
          allowNull: true,
          unique: false
        }, { transaction });
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(transaction => {
      return queryInterface.removeColumn(tableName, 'message_id', { transaction });
    });
  }
};