import { RecordType } from '../constants/enums';
import { isFragment } from './fragment';
import { getUKTimestamp } from "../services/time";
import { addChangesToUpdateParams } from "../utilities/dynamodb-helper";
import { validateIds } from "../utilities/validation-utilities";

const fieldsAllowedToUpdate = [
  'TransferStatus',
  'FailureReason'
];

export const buildCoreUpdateParams = (inboundConversationId, inboundMessageId, changes) => {
  validateIds(inboundConversationId, inboundMessageId);

  const params = {
    Key: {
      InboundConversationId: inboundConversationId,
      Layer: RecordType.CORE
    },
    UpdateExpression: `set UpdatedAt = :now`,
    ExpressionAttributeValues: {
      ':now': getUKTimestamp()
    }
  };

  return addChangesToUpdateParams(params, changes, fieldsAllowedToUpdate);
};

export const isCore = dynamoDbItem => {
  return dynamoDbItem?.Layer?.startsWith(RecordType.CORE);
};

export const isCoreOrFragment = dynamoDbItem => {
  return isCore(dynamoDbItem) || isFragment(dynamoDbItem);
};