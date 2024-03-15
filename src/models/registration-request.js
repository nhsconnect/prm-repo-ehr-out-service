import { getParameters } from './parameters';

/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
const modelName = 'RegistrationRequest';
const tableName = 'registration_requests';

const Status = {
  // PRIMARY PATH
  REGISTRATION_REQUEST_RECEIVED: 'registration_request_received',
  ODS_VALIDATION_CHECKS_PASSED: 'ods_validation_checks_passed',
  SENT_EHR: 'sent_ehr',
  CONTINUE_REQUEST_RECEIVED: 'continue_request_received',
  SENT_FRAGMENTS: 'sent_fragments',
  EHR_INTEGRATED: 'ehr_integrated',

  // ERRONEOUS
  INCORRECT_ODS_CODE: 'incorrect_ods_code',
  MISSING_FROM_REPO: 'missing_from_repo',
  EHR_DOWNLOAD_FAILED: 'ehr_download_failed',
  CORE_SENDING_FAILED: 'core_sending_failed',
  FRAGMENTS_SENDING_FAILED: 'fragments_sending_failed',
  EHR_INTEGRATION_FAILED: 'ehr_integration_failed'
};

Object.freeze(Status);

const model = dataType => ({
  conversationId: {
    field: 'conversation_id',
    type: dataType.UUID,
    primaryKey: true,
    defaultValue: dataType.UUIDV4
  },
  messageId: {
    field: 'message_id',
    type: dataType.UUID,
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

// export default (sequelize, DataTypes) => {
//   return sequelize.define(modelName, model(DataTypes), getParameters(tableName));
// };
