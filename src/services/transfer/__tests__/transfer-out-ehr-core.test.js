import { getRegistrationRequestByConversationId, updateRegistrationRequestMessageId } from '../../database/registration-request-repository';
import { logError, logInfo, logWarning } from '../../../middleware/logging';
import { Status } from '../../../models/registration-request';
import { transferOutEhrCore } from '../transfer-out-ehr-core';
import { getEhrCoreAndFragmentIdsFromRepo } from '../../ehr-repo/get-ehr';
import { createRegistrationRequest } from '../../database/create-registration-request';
import expect from 'expect';
import { v4 as uuid } from 'uuid';
import { sendCore } from '../../gp2gp/send-core';
import {
  PresignedUrlNotFoundError,
  DownloadError,
  MessageIdUpdateError,
  StatusUpdateError,
  errorMessages
} from '../../../errors/errors';
import {
  createNewMessageIds, getNewMessageIdForOldMessageId,
  patientAndPracticeOdsCodesMatch, replaceMessageIdsInObject,
  updateConversationStatus,
} from '../transfer-out-util';
import { parseMessageId } from "../../parser/parsing-utilities";

// Mocking
jest.mock('../../../services/database/create-registration-request');
jest.mock('../../gp2gp/send-core');
jest.mock('../../gp2gp/pds-retrieval-request');
jest.mock('../../ehr-repo/get-ehr');
jest.mock('../../database/registration-request-repository');
jest.mock('../../../middleware/logging');
jest.mock('../transfer-out-util');
jest.mock('../../parser/parsing-utilities');

describe('transferOutEhrCore', () => {
  const conversationId = '5bb36755-279f-43d5-86ab-defea717d93f';
  const ehrRequestId = '870f6ef9-746f-4e81-b51f-884d64530bed';
  const messageId = '835a2b69-bac0-4f6f-97a8-897350604380';
  const newMessageId = uuid();
  const fragmentMessageIds = ['id1', 'id2', 'id3'];
  const messageIdWithReplacementsEhrCoreWithNoFragments = [{ oldMessageId: messageId, newMessageId }];
  const messageIdWithReplacementsEhrCoreWithFragments = [
    { oldMessageId: messageId, newMessageId },
    { oldMessageId: fragmentMessageIds[0], newMessageId: uuid() },
    { oldMessageId: fragmentMessageIds[1], newMessageId: uuid() },
    { oldMessageId: fragmentMessageIds[2], newMessageId: uuid() },
  ];
  const odsCode = 'A12345';
  const nhsNumber = '1111111111';
  const ehrCore = {
    payload: 'payload XML',
    attachments: ['attachment 1', 'attachment 2'],
    external_attachments: ['ext attachment 1', 'ext attachment 2']
  };
  const ehrCoreWithUpdatedMessageId = {
    ...ehrCore,
    payload: 'payload XML with updated message ids'
  };
  const ehrCoreWithUpdatedReferencedFragmentMessageId = {
    ...ehrCore,
    payload: 'payload XML with updated referenced fragment message ids'
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('transfer request validation checks', () => {
    it('should stop EHR transfer if the received EHR request is a duplicated one', async () => {
      // given
      const logInfoMessages = ['EHR transfer out request received'];
      const logWarningMessages = [`EHR out transfer with conversation ID ${conversationId} is already in progress`];

      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce("duplicate_transfer_request");
      await transferOutEhrCore({conversationId, nhsNumber, odsCode, ehrRequestId});

      // then
      expect(logInfo).toHaveBeenCalledTimes(1);
      expect(logInfo).toHaveBeenCalledWith(logInfoMessages[0]);
      expect(logWarning).toHaveBeenCalledTimes(1);
      expect(logWarning).toHaveBeenCalledWith(logWarningMessages[0]);
      expect(updateConversationStatus).not.toHaveBeenCalled();
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should stop EHR transfer if the requested EHR record does not exist in EHR repo', async () => {
      // given
      const error = new PresignedUrlNotFoundError();
      const logInfoMessages = ["Retrieving the patient's health record from the EHR Repository.", "EHR transfer out request received"];

      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValueOnce(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockResolvedValueOnce(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(error);
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(updateConversationStatus).toHaveBeenCalledTimes(2);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.MISSING_FROM_REPO);
      expect(logInfo).toBeCalledTimes(2);
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logInfo).toHaveBeenCalledWith(logInfoMessages[0]);
      expect(logInfo).toHaveBeenCalledWith(logInfoMessages[1]);
      expect(logError).toHaveBeenCalledWith(errorMessages.PRESIGNED_URL_NOT_FOUND_ERROR, undefined);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should stop EHR transfer if failed to download the EHR from S3 presigned URL', async () => {
      // given
      const error = new DownloadError();
      const logInfoMessages = ["EHR transfer out request received", "Retrieving the patient's health record from the EHR Repository."];

      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockResolvedValueOnce(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(error);
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
      expect(patientAndPracticeOdsCodesMatch).toHaveBeenCalledWith(nhsNumber, odsCode);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);
      expect(logInfo).toHaveBeenCalledTimes(2);
      expect(logInfo).toHaveBeenCalledWith(logInfoMessages[0]);
      expect(logInfo).toHaveBeenCalledWith(logInfoMessages[1]);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.EHR_DOWNLOAD_FAILED);
      expect(logError).toHaveBeenCalledWith(errorMessages.DOWNLOAD_ERROR, undefined);
    });

    it('should replace the main message ID in ehr core before sending out, if no fragment', async () => {
      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockResolvedValueOnce(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds: []});
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce(messageIdWithReplacementsEhrCoreWithNoFragments);
      replaceMessageIdsInObject.mockReturnValueOnce(ehrCoreWithUpdatedMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(replaceMessageIdsInObject).toBeCalledWith(ehrCore, messageIdWithReplacementsEhrCoreWithNoFragments);
      expect(sendCore).toBeCalledWith(conversationId, odsCode, ehrCoreWithUpdatedMessageId, ehrRequestId, newMessageId);
    });

    it('should create new Message IDs for a fragment and replace them in ehrCore, if the references them', async () => {
      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValueOnce(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockResolvedValueOnce(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds});
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce(messageIdWithReplacementsEhrCoreWithFragments);
      replaceMessageIdsInObject.mockReturnValueOnce(ehrCoreWithUpdatedReferencedFragmentMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(parseMessageId).toHaveBeenCalledWith(ehrCore);
      expect(createNewMessageIds).toHaveBeenCalledWith([messageId, ...fragmentMessageIds]);
      expect(replaceMessageIdsInObject).toHaveBeenCalledWith(ehrCore, messageIdWithReplacementsEhrCoreWithFragments);
      expect(getNewMessageIdForOldMessageId).toHaveBeenCalledWith(messageId, messageIdWithReplacementsEhrCoreWithFragments);
      expect(sendCore).toBeCalledWith(conversationId, odsCode, ehrCoreWithUpdatedReferencedFragmentMessageId, ehrRequestId, newMessageId);
    });

    it('should send EHR Core on success', async () => {
      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValueOnce(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockResolvedValueOnce(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds});
      replaceMessageIdsInObject.mockReturnValueOnce(ehrCoreWithUpdatedMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);

      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(sendCore).toHaveBeenCalledTimes(1);
      expect(sendCore).toHaveBeenCalledWith(conversationId, odsCode, ehrCoreWithUpdatedMessageId, ehrRequestId, newMessageId);
    });

    it('should not send the EHR Core if the Registration Request cannot be retrieved from the database', async () => {
      // given
      const error = new Error('test error message');

      // when
      getRegistrationRequestByConversationId.mockRejectedValueOnce(error);
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', error);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should not send out the EHR Core if the EHR Request is a duplicate', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce("a previous request");

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(createRegistrationRequest).not.toHaveBeenCalled()
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should not send the EHR Core if the ODS code does not match in PDS', async () => {
      // given
      const message = "The patient's ODS Code in PDS does not match the requesting practice's ODS Code.";

      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValueOnce(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(false);
      
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });
      
      // then
      expect(getRegistrationRequestByConversationId).toHaveBeenCalledWith(conversationId);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.INCORRECT_ODS_CODE, message);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should not send out the EHR Core if failed to update conversation status', async () => {
      // given
      const errorMessage = "EHR transfer out request failed";
      const error = new StatusUpdateError();

      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValueOnce(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockRejectedValueOnce(error);

      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(getRegistrationRequestByConversationId).toHaveBeenCalledWith(conversationId);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
      expect(patientAndPracticeOdsCodesMatch).toHaveBeenCalledWith(nhsNumber, odsCode);
      expect(logError).toHaveBeenCalledWith(errorMessage, error);
      expect(sendCore).not.toBeCalled();
    });

    it('should not send out the EHR Core if we receive a fragment but the process to update its message ids fails', async () => {
      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValueOnce(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      updateConversationStatus.mockResolvedValueOnce(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds});
      replaceMessageIdsInObject.mockImplementationOnce(() => {
        throw new MessageIdUpdateError()
      });

      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(getRegistrationRequestByConversationId).toHaveBeenCalledWith(conversationId);

      expect(updateConversationStatus).toHaveBeenCalledTimes(2);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.ODS_VALIDATION_CHECKS_PASSED);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.CORE_SENDING_FAILED);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should update the registration request with the Outbound Message ID', async () => {
      // when
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      createRegistrationRequest.mockResolvedValue(undefined);
      patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(true);
      updateConversationStatus.mockResolvedValue(undefined);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore, fragmentMessageIds: [] });
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce([{ oldMessageId: messageId, newMessageId }]);
      updateRegistrationRequestMessageId.mockResolvedValue(undefined);
      replaceMessageIdsInObject.mockReturnValueOnce(ehrCoreWithUpdatedMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);
      sendCore.mockResolvedValue(undefined);

      await transferOutEhrCore({
        conversationId,
        nhsNumber,
        messageId,
        odsCode,
        ehrRequestId
      });

      // then
      expect(updateRegistrationRequestMessageId).toBeCalledWith(messageId, newMessageId);
    });
  });
});