import { getRegistrationRequestStatusByConversationId } from '../../database/registration-request-repository';
import { logError, logInfo } from '../../../middleware/logging';
import { Status } from '../../../models/registration-request';
import { transferOutEhrCore } from '../transfer-out-ehr-core';
import { getEhrCoreAndFragmentIdsFromRepo } from '../../ehr-repo/get-ehr';
import { createRegistrationRequest } from '../../database/create-registration-request';
import expect from 'expect';
import { v4 as uuid } from 'uuid';
import { sendCore } from '../../gp2gp/send-core';
import {
  EhrUrlNotFoundError,
  DownloadError,
  MessageIdUpdateError,
} from '../../../errors/errors';
import {
  createNewMessageIdsForAllFragments,
  patientAndPracticeOdsCodesMatch,
  updateConversationStatus,
  updateMessageIdForEhrCore,
  updateReferencedFragmentIds
} from '../transfer-out-util';

// Mocking
jest.mock('../../../services/database/create-registration-request');
jest.mock('../../gp2gp/send-core');
jest.mock('../../gp2gp/pds-retrieval-request');
jest.mock('../../ehr-repo/get-ehr');
jest.mock('../../database/registration-request-repository');
jest.mock('../../../middleware/logging');
jest.mock('../transfer-out-util');

describe('transferOutEhrCore', () => {
  const conversationId = '5bb36755-279f-43d5-86ab-defea717d93f';
  const ehrRequestId = '870f6ef9-746f-4e81-b51f-884d64530bed';
  const messageId = '835a2b69-bac0-4f6f-97a8-897350604380';
  const newMessageId = uuid();
  const odsCode = 'A12345';
  const nhsNumber = '1111111111';
  const ehrCore = {
    payload: 'payload XML',
    attachments: ['attachment 1', 'attachment 2'],
    external_attachments: ['ext attachment 1', 'ext attachment 2']
  };
  const fragmentMessageIds = ['id1', 'id2', 'id3'];
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
  })


  describe('transfer request validation checks', () => {
    it('should stop EHR transfer if the received EHR request is a duplicated one', async () => {
      // given
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce({
        conversationId,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      });

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      // then
      expect(logInfo).toHaveBeenCalledWith('Duplicate transfer out request');
      expect(logInfo).toHaveBeenCalledWith(
        'EHR out transfer with this conversation ID is already in progress'
      );
      expect(updateConversationStatus).not.toHaveBeenCalled();
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should stop EHR transfer if the requested EHR record does not exist in EHR repo', async () => {
      // given
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(new EhrUrlNotFoundError());
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.MISSING_FROM_REPO);
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', new EhrUrlNotFoundError());
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should stop EHR transfer if failed to download the EHR from S3 presigned URL', async () => {
      // given
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(new DownloadError());
      patientAndPracticeOdsCodesMatch.mockResolvedValue(true);

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(conversationId, Status.EHR_DOWNLOAD_FAILED);
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', new DownloadError());
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should validate ODS code in PDS', async () => {
      // given
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({});
      patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(false);

      // when
      await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

      // then
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.INCORRECT_ODS_CODE,
        `Patients ODS Code in PDS does not match requesting practices ODS Code`
      );
      expect(sendCore).not.toHaveBeenCalled();
    });
  });

  it('should replace the main message ID in ehr core before sending out, if no fragment', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore, fragmentMessageIds: [] });
    updateMessageIdForEhrCore.mockResolvedValueOnce({ ehrCoreWithUpdatedMessageId, newMessageId });
    patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(true);

    // when
    await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

    // then
    expect(updateMessageIdForEhrCore).toBeCalledWith(ehrCore);
    expect(sendCore).toHaveBeenCalledWith(conversationId, odsCode, ehrCoreWithUpdatedMessageId, ehrRequestId, newMessageId);
    expect(createNewMessageIdsForAllFragments).not.toHaveBeenCalled();
    expect(updateReferencedFragmentIds).not.toHaveBeenCalled();
  });

  it('should create new message ids for fragment and replace them in ehrCore, if fragment is referenced', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore, fragmentMessageIds });
    updateMessageIdForEhrCore.mockResolvedValueOnce({ ehrCoreWithUpdatedMessageId, newMessageId });
    updateReferencedFragmentIds.mockResolvedValueOnce(
      ehrCoreWithUpdatedReferencedFragmentMessageId
    );

    // when
    await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

    // then
    expect(createNewMessageIdsForAllFragments).toBeCalledWith(fragmentMessageIds);
    expect(updateReferencedFragmentIds).toBeCalledWith(ehrCoreWithUpdatedMessageId);
    expect(sendCore).toHaveBeenCalledWith(conversationId, odsCode, ehrCoreWithUpdatedReferencedFragmentMessageId, ehrRequestId, newMessageId);
  });

  it('should send EHR core on success', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore });
    updateMessageIdForEhrCore.mockResolvedValueOnce({ ehrCoreWithUpdatedMessageId, newMessageId });

    // when
    await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

    // then
    expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, messageId, nhsNumber, odsCode);
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
    expect(sendCore).toHaveBeenCalledWith(conversationId, odsCode, ehrCoreWithUpdatedMessageId, ehrRequestId, newMessageId);
  });

  it('should handle exceptions', async () => {
    // given
    const error = new Error('test error message');
    getRegistrationRequestStatusByConversationId.mockRejectedValueOnce(error);

    // when
    await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

    // then
    expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', error);
    expect(sendCore).not.toHaveBeenCalled();
  });

  it('should not send out the ehrCore if failed to update the message ids', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore });
    updateMessageIdForEhrCore.mockRejectedValueOnce(new MessageIdUpdateError('some error'));

    // when
    await transferOutEhrCore({ conversationId, nhsNumber, messageId, odsCode, ehrRequestId });

    // then
    expect(sendCore).not.toBeCalled();
    expect(logError).toHaveBeenCalledWith(
      'EHR transfer out request failed',
      new MessageIdUpdateError()
    );
  });

  it('should not send out the ehrCore if got fragment and failed to update the message ids for fragment', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    patientAndPracticeOdsCodesMatch.mockResolvedValue(true);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore, fragmentMessageIds });
    updateMessageIdForEhrCore.mockResolvedValueOnce({ ehrCoreWithUpdatedMessageId, newMessageId });
    updateReferencedFragmentIds.mockRejectedValue(new MessageIdUpdateError('some error'));

    // when
    await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    // then
    expect(sendCore).not.toBeCalled();
    expect(logError).toHaveBeenCalledWith(
      'EHR transfer out request failed',
      new MessageIdUpdateError()
    );
  });
});
