import ModelFactory from '../../../models';
import {
  modelName as fragmentsTraceModel,
  Status as fragmentTraceStatus
} from '../../../models/fragments-trace';
import {
  modelName as registrationRequestModel,
  Status as registrationRequestStatus
} from '../../../models/registration-request';
import {
  getFragmentsTraceStatusByMessageId,
  updateFragmentsTraceStatus
} from '../../database/fragments-trace-repository';

describe('fragments-trace-repository.js', () => {
  // ============ COMMON PROPERTIES ============
  const FragmentsTrace = ModelFactory.getByName(fragmentsTraceModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);
  // =================== END ===================

  // Tear Down
  afterAll(async () => {
    await FragmentsTrace.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  // describe('getFragmentsTraceStatusByMessageId', () => {
  //   it('should retrieve the status of ehr fragment by message id', async () => {
  //     // given
  //     const messageId = 'd3809b41-1996-46ff-a103-47aace310ecb';
  //     const conversationId = '22a748b2-fef6-412d-b93a-4f6c68f0f8dd';
  //     const status = fragmentTraceStatus.FRAGMENT_REQUEST_RECEIVED;
  //
  //     // when
  //     await FragmentsTrace.create({
  //       messageId,
  //       conversationId,
  //       status
  //     });
  //
  //     const record = await getFragmentsTraceStatusByMessageId(messageId);
  //
  //     // then
  //     expect(record.messageId).toBe(messageId);
  //     expect(record.conversationId).toBe(conversationId);
  //     expect(record.status).toBe(status);
  //   });
  //
  //   it('should return null when it cannot find the message id in record', async () => {
  //     // when
  //     const messageId = '9dd61fbe-1958-4479-a6aa-14cb4aa9651a'; // Does not exist
  //     const record = await getFragmentsTraceStatusByMessageId(messageId);
  //
  //     // then
  //     expect(record).toBe(null);
  //   });
  // });

  describe('updateFragmentsTraceStatus', () => {
    // ============ COMMON PROPERTIES ============
    const registrationStatus = registrationRequestStatus.REGISTRATION_REQUEST_RECEIVED;
    const initialStatus = fragmentTraceStatus.FRAGMENT_REQUEST_RECEIVED
    const updatedStatus = fragmentTraceStatus.FRAGMENT_SENDING_FAILED;
    const messageId = '9dd61fbe-1958-4479-a6aa-14cb4aa9651a';
    const conversationId = 'efec71f4-bc54-4a31-9453-f1300bf28cef';
    const nhsNumber = '1234567890';
    const odsCode = 'B0145A';
    // =================== END ===================

    it('should update fragment trace status successfully', async () => {
      // when ...
      await RegistrationRequest.create({
        conversationId,
        nhsNumber,
        odsCode,
        status: registrationStatus
      });
      await FragmentsTrace.create({ // ... a fragment trace is created
        messageId,
        conversationId,
        status: initialStatus
      });

      await updateFragmentsTraceStatus(messageId, updatedStatus);

      const record = await FragmentsTrace.findByPk(messageId);

      // then
      expect(record.conversationId).toBe(conversationId);
      expect(record.messageId).toBe(messageId);
      expect(record.status).toBe(updatedStatus);
    });
  });
})