import { getRegistrationRequestStatusByConversationId } from '../../database/registration-request-repository';
import { logError, logInfo } from '../../../middleware/logging';
import { Status } from '../../../models/registration-request';
import { transferOutEhrCore } from '../transfer-out-ehr-core';
import { getEhrCoreAndFragmentIdsFromRepo } from '../../ehr-repo/get-ehr';
import { createRegistrationRequest } from '../../database/create-registration-request';
import expect from 'expect';
import { sendCore } from '../../gp2gp/send-core';
import {
  EhrUrlNotFoundError,
  DownloadError,
  MessageIdUpdateError,
  errorMessages
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

  patientAndPracticeOdsCodesMatch.mockResolvedValue(true);

  updateMessageIdForEhrCore.mockImplementation(ehrCore => ehrCoreWithUpdatedMessageId);

  describe('transfer request validation checks', () => {
    it('should validate duplicate transfer out requests', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce({
        conversationId,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      });

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(true);
      expect(logInfo).toHaveBeenCalledWith('Duplicate transfer out request');
      expect(updateConversationStatus).not.toHaveBeenCalled();
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should validate incomplete EHR where failed to retrieve EHR URL', async () => {
      // when
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(new EhrUrlNotFoundError());

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      // then
      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.MISSING_FROM_REPO
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should validate a failed download of the EHR from a presigned URL', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockRejectedValueOnce(new DownloadError());

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(updateConversationStatus).toHaveBeenCalledWith(
        conversationId,
        Status.EHR_DOWNLOAD_FAILED
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should validate ODS code in PDS', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({});
      patientAndPracticeOdsCodesMatch.mockResolvedValueOnce(false);

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getEhrCoreAndFragmentIdsFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
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
    updateMessageIdForEhrCore.mockResolvedValueOnce(ehrCoreWithUpdatedMessageId);

    // when
    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    // then
    expect(updateMessageIdForEhrCore).toBeCalledWith(ehrCore);
    expect(sendCore).toHaveBeenCalledWith(
      conversationId,
      odsCode,
      ehrCoreWithUpdatedMessageId,
      ehrRequestId
    );
    expect(result).toEqual({ hasFailed: false, inProgress: false });

    expect(createNewMessageIdsForAllFragments).not.toHaveBeenCalled();
    expect(updateReferencedFragmentIds).not.toHaveBeenCalled();
  });

  it('should create new message ids for fragment and replace them in ehrCore, if fragment is referenced', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore, fragmentMessageIds });
    updateReferencedFragmentIds.mockResolvedValueOnce(
      ehrCoreWithUpdatedReferencedFragmentMessageId
    );

    // when
    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    // then
    expect(createNewMessageIdsForAllFragments).toBeCalledWith(fragmentMessageIds);
    expect(updateReferencedFragmentIds).toBeCalledWith(ehrCoreWithUpdatedMessageId);
    expect(sendCore).toHaveBeenCalledWith(
      conversationId,
      odsCode,
      ehrCoreWithUpdatedReferencedFragmentMessageId,
      ehrRequestId
    );
    expect(result).toEqual({ hasFailed: false, inProgress: false });
  });

  it('should send EHR core on success', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore });

    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    expect(result.inProgress).toBe(false);
    expect(result.hasFailed).toBe(false);
    expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
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
    expect(logInfo).toHaveBeenCalledWith(`Sending EHR core`);
    expect(sendCore).toHaveBeenCalledWith(
      conversationId,
      odsCode,
      ehrCoreWithUpdatedMessageId,
      ehrRequestId
    );
  });

  it('should handle exceptions', async () => {
    let error = new Error('test error message');
    getRegistrationRequestStatusByConversationId.mockRejectedValueOnce(error);

    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });
    expect(result.hasFailed).toBe(true);
    expect(result.error).toBe('test error message');
    expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', error);
    expect(sendCore).not.toHaveBeenCalled();
  });

  it('should not send out the ehrCore if failed to update the message ids', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore });
    updateMessageIdForEhrCore.mockRejectedValueOnce(new MessageIdUpdateError('some error'));

    // when
    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    // then
    expect(sendCore).not.toBeCalled();
    expect(result).toEqual({
      hasFailed: true,
      error: errorMessages.MESSAGE_ID_UPDATE_ERROR
    });
  });

  it('should not send out the ehrCore if got fragment and failed to update the message ids for fragment', async () => {
    // given
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getEhrCoreAndFragmentIdsFromRepo.mockResolvedValueOnce({ ehrCore, fragmentMessageIds });
    updateReferencedFragmentIds.mockRejectedValueOnce(new MessageIdUpdateError('some error'));

    // when
    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    // then
    expect(sendCore).not.toBeCalled();
    expect(result).toEqual({
      hasFailed: true,
      error: errorMessages.MESSAGE_ID_UPDATE_ERROR
    });
  });
});
