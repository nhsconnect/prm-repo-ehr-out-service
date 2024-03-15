/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
import { getParameters } from './parameters';

const modelName = 'Acknowledgement';
const tableName = 'acknowledgements';

const model = dataType => ({
    messageId: {
        field: 'message_id',
        type: dataType.UUID,
        primaryKey: true,
        allowNull: false
    },
    acknowledgementTypeCode: {
        field: 'acknowledgement_type_code',
        type: dataType.STRING,
        allowNull: false
    },
    acknowledgementDetail: {
        field: 'acknowledgement_detail',
        type: dataType.STRING,
        allowNull: false
    },
    service: {
        field: 'service',
        type: dataType.STRING,
        allowNull: false
    },
    referencedMessageId: {
        field: 'referenced_message_id',
        type: dataType.STRING,
        allowNull: false
    },
    messageRef: {
        field: 'message_ref',
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
//     return sequelize.define(modelName, model(DataTypes), getParameters(tableName));
// };
