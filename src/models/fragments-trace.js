import { getParameters } from './parameters';

export const modelName = 'FragmentsTrace';
const tableName = 'fragments_trace';

export const Status = {
    // PRIMARY PATH
    FRAGMENT_REQUEST_RECEIVED: 'fragment_request_received',
    ODS_VALIDATION_CHECKS_PASSED: 'ods_validation_checks_passed',
    SENT_FRAGMENT: 'sent_fragment',

    // ERRONEOUS
    INCORRECT_ODS_CODE: 'incorrect_ods_code',
    MISSING_FROM_REPO: 'missing_from_repo',
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
        foreignKey: true, // Look into delete cascading options etc...
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
