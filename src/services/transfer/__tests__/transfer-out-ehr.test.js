import { initializeConfig } from '../../../config';
import {
  getRegistrationRequestStatusByConversationId,
  updateRegistrationRequestStatus
} from '../../database/registration-request-repository';
import { logError, logInfo } from '../../../middleware/logging';
import { Status } from '../../../models/registration-request';
import { transferOutEhr } from '../transfer-out-ehr';
import { getPatientHealthRecordFromRepo } from '../../ehr-repo/get-health-record';
import { getPdsOdsCode } from '../../gp2gp/pds-retrieval-request';
import { sendEhrExtract } from '../../gp2gp/send-ehr-extract';
import { createRegistrationRequest } from '../../database/create-registration-request';

jest.mock('../../../services/database/create-registration-request');
jest.mock('../../gp2gp/send-ehr-extract');
jest.mock('../../gp2gp/pds-retrieval-request');
jest.mock('../../ehr-repo/get-health-record');
jest.mock('../../../services/database/registration-request-repository');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));
jest.mock('../../../middleware/logging');

describe('transferOutEhr', () => {
  const conversationId = '5bb36755-279f-43d5-86ab-defea717d93f';
  const ehrRequestId = '870f6ef9-746f-4e81-b51f-884d64530bed';
  const odsCode = 'A12345';
  const nhsNumber = '1111111111';
  const coreEhrMessageUrl = 'fake-url';

  describe('transfer request validation checks', () => {
    it('should validate duplicate transfer out requests', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce({
        conversationId,
        status: Status.REGISTRATION_REQUEST_RECEIVED
      });

      const result = await transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(true);
      expect(logInfo).toHaveBeenCalledWith('Duplicate transfer out request');
      expect(updateRegistrationRequestStatus).not.toHaveBeenCalled();
      expect(sendEhrExtract).not.toHaveBeenCalled();
    });

    it('should validate incomplete health record', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getPatientHealthRecordFromRepo.mockResolvedValueOnce(null);

      const result = await transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getPatientHealthRecordFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(initializeConfig).toHaveBeenCalled();
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
        conversationId,
        Status.MISSING_FROM_REPO
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient health record from EHR repo`);
      expect(logInfo).toHaveBeenCalledWith(
        `Patient does not have a complete health record in repo`
      );
      expect(sendEhrExtract).not.toHaveBeenCalled();
    });

    it('should validate ODS code in PDS', async () => {
      getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
      getPatientHealthRecordFromRepo.mockResolvedValueOnce({});
      getPdsOdsCode.mockResolvedValueOnce('B1234');

      const result = await transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId });

      expect(result.inProgress).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
      expect(getPatientHealthRecordFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
      expect(initializeConfig).toHaveBeenCalled();
      expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
        conversationId,
        Status.INCORRECT_ODS_CODE
      );
      expect(logInfo).toHaveBeenCalledWith(`Getting patient current ODS code`);
      expect(logInfo).toHaveBeenCalledWith(
        `Patients ODS Code in PDS does not match requesting practices ODS Code`
      );
      expect(sendEhrExtract).not.toHaveBeenCalled();
    });
  });

  it('should send EHR extract on success', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValueOnce(null);
    getPatientHealthRecordFromRepo.mockResolvedValueOnce({ coreEhrMessageUrl });
    getPdsOdsCode.mockResolvedValueOnce(odsCode);

    const result = await transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId });

    expect(result.inProgress).toBe(false);
    expect(result.hasFailed).toBe(false);
    expect(createRegistrationRequest).toHaveBeenCalledWith(conversationId, nhsNumber, odsCode);
    expect(getPatientHealthRecordFromRepo).toHaveBeenCalledWith(nhsNumber, conversationId);
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(
      conversationId,
      Status.VALIDATION_CHECKS_PASSED
    );
    expect(initializeConfig).toHaveBeenCalled();
    expect(updateRegistrationRequestStatus).toHaveBeenCalledWith(conversationId, Status.SENT_EHR);
    expect(logInfo).toHaveBeenCalledWith(`Sending EHR extract`);
    expect(sendEhrExtract).toHaveBeenCalledWith(
      conversationId,
      odsCode,
      ehrRequestId,
      coreEhrMessageUrl
    );
  });

  it('should handle exceptions', async () => {
    let error = new Error('test error message');
    getRegistrationRequestStatusByConversationId.mockRejectedValueOnce(error);

    const result = await transferOutEhr({ conversationId, nhsNumber, odsCode, ehrRequestId });

    expect(result.hasFailed).toBe(true);
    expect(result.error).toBe('test error message');
    expect(logError).toHaveBeenCalledWith('EHR transfer out request failed', error);
    expect(sendEhrExtract).not.toHaveBeenCalled();
  });
});
