import { getRegistrationRequestByConversationId } from '../../database/registration-request-repository';
import { logError, logInfo } from '../../../middleware/logging';
import { Status } from '../../../models/registration-request';
import { transferOutEhrCore } from '../transfer-out-ehr-core';
import { getEhrCoreAndFragmentIdsFromRepo } from '../../ehr-repo/get-ehr';
import { createRegistrationRequest } from '../../database/create-registration-request';
import expect from 'expect';
import { v4 as uuid } from 'uuid';
import { sendCore } from '../../gp2gp/send-core';
import { EhrUrlNotFoundError, DownloadError, MessageIdUpdateError } from '../../../errors/errors';
import {
  createNewMessageIds, getNewMessageIdForOldMessageId,
  patientAndPracticeOdsCodesMatch, replaceMessageIdsInObject,
  updateConversationStatus,
} from '../transfer-out-util';
import {parseMessageId} from "../../parser/parsing-utilities";

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
      getRegistrationRequestByConversationId.mockResolvedValueOnce({
        conversationId,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      });

      // when
      await transferOutEhrCore({conversationId, nhsNumber, odsCode, ehrRequestId});

      // then
      expect(logInfo).toHaveBeenNthCalledWith(
        2,
        `EHR out transfer with conversation ID ${conversationId} is already in progress`
      );
      expect(updateConversationStatus).not.toHaveBeenCalled();
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should stop EHR transfer if the requested EHR record does not exist in EHR repo', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(new EhrUrlNotFoundError());
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(
        conversationId,
        messageId,
        nhsNumber,
        odsCode
      );
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.MISSING_FROM_REPO
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(logError).toHaveBeenCalledWith(
        'EHR transfer out request failed',
        new EhrUrlNotFoundError()
      );
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should stop EHR transfer if failed to download the EHR from S3 presigned URL', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(new DownloadError());
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(
        conversationId,
        messageId,
        nhsNumber,
        odsCode
      );
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.EHR_DOWNLOAD_FAILED
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', new DownloadError());
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should replace the main message ID in ehr core before sending out, if no fragment', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds: []});
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce(messageIdWithReplacementsEhrCoreWithNoFragments);
      replaceMessageIdsInObject.mockResolvedValueOnce(ehrCoreWithUpdatedMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(replaceMessageIdsInObject).toBeCalledWith(ehrCore, messageIdWithReplacementsEhrCoreWithNoFragments);
      expect(sendCore).toBeCalledWith(
        conversationId,
        odsCode,
        ehrCoreWithUpdatedMessageId,
        ehrRequestId,
        newMessageId
      );
    });

    it('should create new message ids for fragment and replace them in ehrCore, if fragment is referenced', async () => {
      // given
      const allMessageIds = [messageId].concat(fragmentMessageIds);

      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds});
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce(messageIdWithReplacementsEhrCoreWithFragments);
      replaceMessageIdsInObject.mockResolvedValueOnce(ehrCoreWithUpdatedMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(createNewMessageIds).toBeCalledWith(allMessageIds);
      expect(sendCore).toHaveBeenCalledWith(
        conversationId,
        odsCode,
        ehrCoreWithUpdatedReferencedFragmentMessageId,
        ehrRequestId,
        newMessageId
      );
    });

    it('should send EHR core on success', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds});
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce(messageIdWithReplacementsEhrCoreWithFragments);
      replaceMessageIdsInObject.mockResolvedValueOnce(ehrCoreWithUpdatedMessageId);
      getNewMessageIdForOldMessageId.mockReturnValueOnce(newMessageId);

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(
        conversationId,
        messageId,
        nhsNumber,
        odsCode
      );
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.ODS_VALIDATION_CHECKS_PASSED
      );
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.SENT_EHR,
        'EHR has been successfully sent'
      );
      expect(logInfo).toHaveBeenCalledWith('EHR transfer out started');
      expect(logInfo).toHaveBeenCalledWith(`Sending EHR core`);
      expect(sendCore).toHaveBeenCalledWith(
        conversationId,
        odsCode,
        ehrCoreWithUpdatedMessageId,
        ehrRequestId,
        newMessageId
      );
    });

    it('should not send the ehrCore if the registrationRequest cannot be retrieved from the database', async () => {
      // given
      const error = new Error('test error message');
      getRegistrationRequestByConversationId.mockRejectedValueOnce(error);

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', error);
      expect(sendCore).not.toHaveBeenCalled();
    });

    // TODO PRMT-4074
    it('should not send out the ehrCore if ehrRequest is a duplicate', async () => {

    });

    it('should not send the ehrCore if the ODS code does not match in PDS', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({});
      patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(false);

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(
        conversationId,
        messageId,
        nhsNumber,
        odsCode
      );
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.INCORRECT_ODS_CODE,
        `Patients ODS Code in PDS does not match requesting practices ODS Code`
      );
      expect(sendCore).not.toHaveBeenCalled();
    });

    // TODO PRMT-4074
    it('should not send out the ehrCore if failed to update conversation status', async () => {

    });

    it('should not send out the ehrCore if failed to update the message ids', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore});
      parseMessageId.mockResolvedValueOnce(messageId);
      createNewMessageIds.mockResolvedValueOnce(messageIdWithReplacementsEhrCoreWithFragments);
      replaceMessageIdsInObject().mockRejectedValueOnce(new MessageIdUpdateError('some error'));

      // when
      await transferOutEhrCore({conversationId, nhsNumber, messageId, odsCode, ehrRequestId});

      // then
      expect(sendCore).not.toBeCalled();
      expect(logError).toHaveBeenCalledWith(
        'EHR transfer out request failed',
        new MessageIdUpdateError()
      );
    });

    it('should not send out the ehrCore if got fragment and failed to update the message ids for fragment', async () => {
      // given
      getRegistrationRequestByConversationId.mockResolvedValueOnce(null);
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ehrCore, fragmentMessageIds});
      updateMessageIdForEhrCore.mockResolvedValueOnce({ehrCoreWithUpdatedMessageId, newMessageId});
      updateReferencedFragmentIds.mockRejectedValue(new MessageIdUpdateError('some error'));

      // when
      await transferOutEhrCore({conversationId, nhsNumber, odsCode, ehrRequestId});

      // then
      expect(sendCore).not.toBeCalled();
      expect(logError).toHaveBeenCalledWith(
        'EHR transfer out request failed',
        new MessageIdUpdateError()
      );
    });

    // TODO PRMT-4074
    it('should not send out the ehrCore if failed to send the core', async () => {

    });
  });
});
