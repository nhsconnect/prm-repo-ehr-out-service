// module.exports = {
//   async up(queryInterface, Sequelize) {
//     await queryInterface.createTable('FragmentsTraces', {
//       id: {
//         allowNull: false,
//         autoIncrement: true,
//         primaryKey: true,
//         type: Sequelize.INTEGER
//       },
//       messageId: {
//         type: Sequelize.UUID
//       },
//       conversationId: {
//         type: Sequelize.UUID
//       },
//       status: {
//         type: Sequelize.STRING
//       },
//       createdAt: {
//         type: Sequelize.DATE
//       },
//       updatedAt: {
//         type: Sequelize.DATE
//       },
//       deletedAt: {
//         type: Sequelize.DATE
//       },
//       createdAt: {
//         allowNull: false,
//         type: Sequelize.DATE
//       },
//       updatedAt: {
//         allowNull: false,
//         type: Sequelize.DATE
//       }
//     });
//   },
//   async down(queryInterface, Sequelize) {
//     await queryInterface.dropTable('FragmentsTraces');
//   }
// };

'use strict';

const tableName = 'fragments_trace';

const model = dataType => {
  return {
    messageId: {
      field: 'message_id',
      type: dataType.UUID,
      primaryKey: true,
      defaultValue: dataType.UUIDV4
    },
    conversationId: {
      field: 'conversation_id',
      type: dataType.UUID,
      defaultValue: dataType.UUIDV4
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
