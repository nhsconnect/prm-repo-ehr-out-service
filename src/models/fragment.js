import { FragmentStatus, RecordType } from '../constants/enums';
import { validate } from 'uuid';
import { getUKTimestamp } from '../services/time';
import { addChangesToUpdateParams } from '../utilities/dynamodb-helper';
import { ValidationError } from '../errors/errors';
import { logInfo } from '../middleware/logging';

const fieldsAllowedToUpdate = [
  'TransferStatus',
  'OutboundMessageId',
  'AcknowledgementReceivedAt',
  'AcknowledgementTypeCode',
  'AcknowledgementDetail'
];

export const buildFragmentUpdateParams = (inboundConversationId, inboundMessageId, changes) => {
  validateIds(inboundConversationId, inboundMessageId);

  const params = {
    Key: {
      InboundConversationId: inboundConversationId,
      Layer: [RecordType.FRAGMENT, inboundMessageId].join('#')
    },
    UpdateExpression: `set UpdatedAt = :now`,
    ExpressionAttributeValues: {
      ':now': getUKTimestamp()
    }
  };

  return addChangesToUpdateParams(params, changes, fieldsAllowedToUpdate);
};

const validateIds = (conversationId, messageId) => {
  const uuidsAreValid = validate(conversationId) && validate(messageId);
  if (!uuidsAreValid) {
    throw new ValidationError(
      'received invalid uuid as either conversationId or messageId. ' +
        `ConversationId: ${conversationId}, messageId: ${messageId}`
    );
  }
};

export const isSentOut = fragment => {
  return [FragmentStatus.OUTBOUND_SENT, FragmentStatus.OUTBOUND_COMPLETE].includes(
    fragment?.TransferStatus
  );
};

export const isNotSentOut = fragment => {
  return !isSentOut(fragment);
};

export const isFragment = dynamoDbItem => {
  return dynamoDbItem?.Layer?.startsWith(RecordType.FRAGMENT);
};
