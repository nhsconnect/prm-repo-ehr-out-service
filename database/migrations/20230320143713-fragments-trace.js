'use strict';

const tableName = 'fragments_trace';

const model = dataType => {
  return {
    messageId: {
      field: 'message_id',
      type: dataType.UUID,
      primaryKey: true
    },
    conversationId: {
      field: 'conversation_id',
      type: dataType.UUID,
      references: {
        model: {
          tableName: 'registration_requests'
        },
        key: 'conversation_id'
      },
      allowNull: false
    },
    status: {
      field: 'status',
      type: dataType.STRING,
      allowNull: false,
      isIn: [
        [
          'fragment_request_received',
        ]
      ]
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