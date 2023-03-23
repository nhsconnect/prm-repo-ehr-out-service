import ModelFactory from '../../../models';
import { modelName, Status } from '../../../models/fragments-trace';
import {
  getFragmentsTraceStatusByMessageId,
  updateFragmentsTraceStatus
} from '../../database/fragments-trace-repository';

describe('Fragments trace repository', () => {
  const FragmentsTrace = ModelFactory.getByName(modelName);

  afterAll(async () => {
    await FragmentsTrace.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  describe('getFragmentsTraceStatusByMessageId', () => {
    it('should retrieve the status of ehr fragment by message id', async () => {
      // given
      const messageId = '52ED7576-C8CE-48BD-A8FD-C86ACF6A8C02';
      const conversationId = '22a748b2-fef6-412d-b93a-4f6c68f0f8dd';
      const status = Status.FRAGMENT_REQUEST_RECEIVED;
      await FragmentsTrace.create({
        messageId,
        conversationId,
        status
      });

      // when
      const record = await getFragmentsTraceStatusByMessageId(messageId);

      // then
      expect(record.messageId).toBe(messageId);
      expect(record.conversationId).toBe(conversationId);
      expect(record.status).toBe(status);
    });

    it('should return null when it cannot find the message id in record', async () => {
      // when
      const messageId = 'non-exist-message-id'
      const record = await getFragmentsTraceStatusByMessageId(messageId);

      // then
      expect(record).toBe(null);
    });
  });


  describe('updateFragmentsTraceStatus', () => {
    it('should change registration request status to', () => {

    });
  });
})