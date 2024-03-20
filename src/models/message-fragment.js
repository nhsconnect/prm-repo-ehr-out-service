import { getParameters } from './parameters';

/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
const modelName = 'MessageFragment';
const tableName = 'message_fragment';

const Status = {
    // PRIMARY PATH
    FRAGMENT_REQUEST_RECEIVED: 'fragment_request_received',
    SENT_FRAGMENT: 'sent_fragment',

    // ERRONEOUS
    MISSING_FROM_REPO: 'missing_from_repo',
    DOWNLOAD_FAILED: 'download_failed',
    SENDING_FAILED: 'sending_failed'
};

Object.freeze(Status);

const model = dataType => ({
    messageId: {
        field: 'message_id',
        type: dataType.UUID,
        primaryKey: true
    },
    conversationId: {
        field: 'conversation_id',
        type: dataType.UUID,
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

// export default (sequelize, DataTypes) => {
//     return sequelize.define(modelName, model(DataTypes), getParameters(tableName));
// };
