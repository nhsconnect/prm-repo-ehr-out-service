import { getParameters } from './parameters';

export const modelName = 'FragmentsTrace';
const tableName = 'fragments_trace';

export const Status = {
    FRAGMENT_REQUEST_RECEIVED: 'fragment_request_received',
    INCORRECT_ODS_CODE: 'incorrect_ods_code',
    MISSING_FROM_REPO: 'missing_from_repo',
    EHR_DOWNLOAD_FAILED: 'ehr_download_failed',
    VALIDATION_CHECKS_PASSED: 'validation_checks_passed',
    SENT_FRAGMENT: 'sent_fragment'
};

Object.freeze(Status);

const model = dataType => ({
    messageId: {
        field: 'message_id',
        type: dataType.UUID,
        primaryKey: true,
        defaultValue: dataType.UUIDV4
    },
    conversationId: {
        field: 'conversation_id',
        type: dataType.UUID,
        // foreignKey: true,
        defaultValue: dataType.UUIDV4
    },
    status: {
        field: 'status',
        type: dataType.STRING,
        isIn: [Object.values(Status)],
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
