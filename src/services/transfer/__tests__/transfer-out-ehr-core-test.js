import { initializeConfig } from '../../../config';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../../database/registration-request-repository';
import { logError, logInfo } from '../../../middleware/logging';
import { Status } from '../../../models/registration-request';
import { transferOutEhrCore } from "../transfer-out-ehr-core";
import { getEhrCoreFromRepo } from "../../ehr-repo/get-ehr";
import { getPdsOdsCode } from '../../gp2gp/pds-retrieval-request';
import { createRegistrationRequest } from '../../database/create-registration-request';
import expect from "expect";
import { sendCore } from "../../gp2gp/send-core";
import {EhrUrlNotFoundError, EhrDownloadError} from "../../../errors/errors";

jest.mock('../../../services/database/create-registration-request');
jest.mock('../../gp2gp/send-core');
jest.mock('../../gp2gp/pds-retrieval-request');
jest.mock('../../ehr-repo/get-ehr');
jest.mock('../../../services/database/registration-request-repository');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');

describe('transferOutEhrCore', () => {
  const conversationId = '5bb36755-279f-43d5-86ab-defea717d93f';
  const ehrRequestId = '870f6ef9-746f-4e81-b51f-884d64530bed';
  const odsCode = 'A12345';
  const nhsNumber = '1111111111';
  const ehrCore = {
    payload: "payload XML",
    attachments: ["attachment 1", "attachment 2"],
    external_attachments: ["ext attachment 1", "ext attachment 2"]
  }

  describe('transfer request validation checks', () => {
    it('should validate duplicate transfer out requests', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce({
        conversationId,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      });

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(true);
      expect(logInfo).toHaveBeenCalledWith('Duplicate transfer out request');
      expect(updateRegistrationRequestStatus).not.toHaveBeenCalled();
      expect(sendCore).not.toHaveBeenCalled();
    });


    it('should validate incomplete EHR where failed to retrieve EHR URL', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreFromRepo.mockRejectedValueOnce(new EhrUrlNotFoundError());

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getEhrCoreFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(initializeConfig).toHaveBeenCalled();
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, Status.MISSING_FROM_REPO);
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should validate a failed download of the EHR from a presigned URL', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreFromRepo.mockRejectedValueOnce(new EhrDownloadError());

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getEhrCoreFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(initializeConfig).toHaveBeenCalled();
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, Status.EHR_DOWNLOAD_FAILED);
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(sendCore).not.toHaveBeenCalled();
    });

    it('should validate ODS code in PDS', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getEhrCoreFromRepo.mockResolvedValueOnce({});
      getPdsOdsCode.mockResolvedValueOnce('B1234');

      const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getEhrCoreFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(initializeConfig).toHaveBeenCalled();
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
        conversationId,
        Status.INCORRECT_ODS_CODE
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient current ODS code`);
      expect(logInfo).toHaveBeenCalledWith(
        `Patients ODS Code in PDS does not match requesting practices ODS Code`
      );
      expect(sendCore).not.toHaveBeenCalled();
    });
  });

  it('should send EHR core on success', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getEhrCoreFromRepo.mockResolvedValueOnce(ehrCore);
    getPdsOdsCode.mockResolvedValueOnce(odsCode);

    const result = await transferOutEhrCore({ conversationId, nhsNumber, odsCode, ehrRequestId });

    expect(result.inProgress).toBe(false);
    expect(result.hasFailed).toBe(false);
    expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
    expect(getEhrCoreFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
      conversationId,
      Status.VALIDATION_CHECKS_PASSED
    );
    expect(initializeConfig).toHaveBeenCalled();
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, Status.SENT_EHR);
    expect(logInfo).toHaveBeenCalledWith(`Sending EHR core`);
    expect(sendCore).toHaveBeenCalledWith(
      conversationId,
      odsCode,
      ehrCore,
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
});