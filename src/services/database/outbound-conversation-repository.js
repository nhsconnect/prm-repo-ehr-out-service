// to replace create-registration-request.js registration-request-repository.js

import { EhrTransferTracker } from './dynamo-ehr-transfer-tracker';
import {
  buildConversationUpdateParams,
  isComplete,
  isConversation
} from '../../models/conversation';
import {
  NhsNumberNotFoundError,
  OutboundConversationNotFoundError,
  PatientRecordNotFoundError
} from '../../errors/errors';
import { logInfo } from '../../middleware/logging';
import { ConversationStatus } from '../../constants/enums';

export const createOutboundConversation = async (outboundConversationId, nhsNumber, odsCode) => {
  const db = EhrTransferTracker.getInstance();
  const inboundConversationId = await getCurrentConversationForPatient(nhsNumber);

  // TODO: special process if already has outbound record;

  const updateParams = buildConversationUpdateParams(inboundConversationId, {
    OutboundConversationId: outboundConversationId,
    TransferStatus: ConversationStatus.OUTBOUND_STARTED,
    DestinationGp: odsCode
  });
  await db.updateSingleItem(updateParams);
};

export const getCurrentConversationForPatient = async nhsNumber => {
  const db = EhrTransferTracker.getInstance();
  const conversations = await db.queryTableByNhsNumber(nhsNumber);

  const completedRecords = conversations?.filter(isComplete);

  if (!completedRecords || completedRecords.length === 0) {
    throw new PatientRecordNotFoundError();
  }

  const currentRecord = completedRecords.reduce((prev, current) => {
    return current?.CreatedAt > prev?.CreatedAt ? current : prev;
  });

  return currentRecord.InboundConversationId;
};

export const getOutboundConversationById = async outboundConversationId => {
  const db = EhrTransferTracker.getInstance();
  const outboundRecords = await db.queryTableByOutboundConversationId(outboundConversationId);
  const outboundConversation = outboundRecords?.filter(isConversation)?.[0];
  if (!outboundConversation) {
    throw new OutboundConversationNotFoundError();
  }
  return outboundConversation;
};

export const getNhsNumberByOutboundConversationId = async outboundConversationId => {
  const conversation = await getOutboundConversationById(outboundConversationId);
  if (!conversation?.NhsNumber) {
    throw new NhsNumberNotFoundError();
  }
  return conversation.NhsNumber;
};

export const updateOutboundConversationStatus = async (outboundConversationId, status) => {
  const db = await EhrTransferTracker.getInstance();

  logInfo(
    `Updating outbound conversation status ${status}, conversationId: ${outboundConversationId}`
  );
  const conversation = await getOutboundConversationById(outboundConversationId);
  if (!conversation) {
    throw new Error('no record was found by given conversationId');
  }

  const inboundConversationId = conversation.InboundConversationId;
  const updateParam = buildConversationUpdateParams(inboundConversationId, {
    TransferStatus: status
  });

  await db.updateSingleItem(updateParam);
};
