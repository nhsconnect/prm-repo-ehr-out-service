import { getParameters } from './parameters';

export const modelName = 'Acknowledgement';
const tableName = 'acknowledgements';

/*
  fields required for acknowledgement table
  messageId (UNIQUE TO ACK MESSAGE)
  conversationId (ASSUMED TO BE THE CONVO ID IN RESPONSE)

  referencedMessageId (MID IN RESPONSE)
  typeCode
  RSONS (MAY OR MAY NOT BE PRESENT) (can't recall name array of failure reasons)
    EITHER:
      1. acknowledgement -> acknowledgementDetail -> code -> (attr) displayName
      2.
 */

const model = dataType => ({
  messageId: {
    field: 'message_id',
    type: dataType.UUID,
    primaryKey: true
  },
  service: {
    field: 'service',
    type: dataType.STRING,
    allowNull: false
  },
  ackTypeCode: {
    field: 'acknowledgement_type_code',
    type: dataType.STRING,
    allowNull: false
  },
  ackDetail: {
    field: 'acknowledgement_detail',
    type: dataType.STRING,
    allowNull: false
  },
  failureReason: {
    field: 'failure_reason',
    type: dataType.STRING
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
