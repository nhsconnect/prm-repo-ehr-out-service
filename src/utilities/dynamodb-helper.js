import { logError } from '../middleware/logging';
import { validate } from 'uuid';
import { getEpochTimeInSecond, getUKTimestamp } from '../services/time';
import moment from 'moment-timezone';
import { INTERACTION_IDS } from '../constants/interaction-ids';
import { ConversationStatus, CoreStatus, FragmentStatus, RecordType } from '../constants/enums';
import { isConversation } from '../models/conversation';
import { isCore } from '../models/core';
import { isFragment } from '../models/fragment';

export const addChangesToUpdateParams = (params, changes, fieldsAllowedToUpdate) => {
  for (const [fieldName, updatedValue] of Object.entries(changes)) {
    if (!fieldsAllowedToUpdate.includes(fieldName)) {
      logError(`Ignoring attempt to update non-allowed field ${fieldName}`);
      continue;
    }
    const keyToken = `#${fieldName}`;
    const valueToken = `:${fieldName}`;

    params.UpdateExpression += `, ${keyToken} = ${valueToken}`;
    params.ExpressionAttributeValues[valueToken] = updatedValue;
    params.ExpressionAttributeNames = params.ExpressionAttributeNames ?? {};
    params.ExpressionAttributeNames[keyToken] = fieldName;
  }

  return params;
};

export const buildUpdateParamFromItem = (item, changes) => {
  // NOTE: Use this method with caution as it bypass the field check
  const baseParams = {
    Key: {
      InboundConversationId: item.InboundConversationId,
      Layer: item.Layer
    },
    UpdateExpression: `SET UpdatedAt = :now`,
    ExpressionAttributeValues: {
      ':now': getUKTimestamp()
    }
  };
  return addChangesToUpdateParams(baseParams, changes, Object.keys(changes));
};

export const buildParamsToClearPreviousOutboundRecord = (item) => {
  let restoredStatus;
  if (isConversation(item)) {
    restoredStatus = ConversationStatus.INBOUND_COMPLETE;
  } else if (isCore(item)) {
    restoredStatus = CoreStatus.INBOUND_COMPLETE;
  } else if (isFragment(item)) {
    restoredStatus = FragmentStatus.INBOUND_COMPLETE;
  } else {
    throw new Error(`Got unexpected dynamodb item: ${item}`);
  }

  return {
    Key: {
      InboundConversationId: item.InboundConversationId,
      Layer: item.Layer
    },
    UpdateExpression:
      'SET UpdatedAt = :now, TransferStatus = :restoredStatus \
       REMOVE OutboundConversationId, OutboundMessageId',
    ExpressionAttributeValues: {
      ':now': getUKTimestamp(),
      ':restoredStatus': restoredStatus
    }
  };
};
