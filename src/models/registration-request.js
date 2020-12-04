import { getParameters } from './parameters';

export const modelName = 'RegistrationRequest';
const tableName = 'registration_requests';

export const Status = {
  REGISTRATION_REQUEST_RECEIVED: 'registration_request_received',
  INVALID_ODS_CODE: 'invalid_ods_code'
};

Object.freeze(Status);

const model = dataType => ({
  conversationId: {
    field: 'conversation_id',
    type: dataType.UUID,
    primaryKey: true,
    defaultValue: dataType.UUIDV4
  },
  nhsNumber: {
    field: 'nhs_number',
    type: dataType.CHAR(10),
    validate: {
      isNumeric: true,
      len: 10
    },
    allowNull: false
  },
  status: {
    field: 'status',
    type: dataType.STRING,
    isIn: [Object.values(Status)],
    allowNull: false
  },
  odsCode: {
    field: 'ods_code',
    type: dataType.STRING,
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
