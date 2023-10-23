import { logInfo, logError } from '../../../middleware/logging';
import ModelFactory from '../../../models';
import { modelName } from '../../../models/message-id-replacement';
import { createMessageIdReplacements } from '../create-message-id-replacements';
import { runWithinTransaction } from '../helper';
import { v4 } from 'uuid';
import { UniqueConstraintError, DatabaseError } from 'sequelize';
import { errorMessages } from '../../../errors/errors';

jest.mock('../../../middleware/logging');

describe('createMessageIdReplacement', () => {
  afterAll(() => {
    // close the db connection to avoid "Jest did not exit" warning messages
    MessageIdReplacement.sequelize.close();
  });

  const MessageIdReplacement = ModelFactory.getByName(modelName);

  const uuidv4 = () => v4().toUpperCase();

  it('should create a record of oldMessageId with newMessageId', async () => {
    // given
    const oldMessageId = uuidv4();
    const newMessageId = uuidv4();

    // when
    await createMessageIdReplacements([{oldMessageId, newMessageId}]);

    // then
    const record = await runWithinTransaction(transaction =>
      MessageIdReplacement.findOne({
        where: {
          old_message_id: oldMessageId
        },
        transaction: transaction
      })
    );
    expect(record).not.toBeNull();
    // postgres db force the stored uuid to become lowercase, so uppercase them before comparison
    expect(record.get().oldMessageId.toUpperCase()).toBe(oldMessageId);
    expect(record.get().newMessageId.toUpperCase()).toBe(newMessageId);
  });

  it('should log event if data persisted correctly', async () => {
    // given
    const oldMessageId = uuidv4();
    const newMessageId = uuidv4();

    // when
    await createMessageIdReplacements([{oldMessageId, newMessageId}]);

    // then
    const expectedLogMessage = "Recorded new message IDs in database";
    expect(logInfo).toBeCalledWith(expectedLogMessage);
  });

  it('should throw an error when oldMessageId is invalid', async () => {
    // given
    const oldMessageId = 'INVALID-OLD-MESSAGE-ID';
    const newMessageId = uuidv4();
    // when
    await expect(createMessageIdReplacements([{oldMessageId, newMessageId}]))
      // then
      .rejects.toThrow('invalid input syntax for type uuid');

    expect(logError).toHaveBeenCalledWith(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
  });

  it('should throw an error when newMessageId is invalid', async () => {
    // given
    const oldMessageId = uuidv4();
    const newMessageId = 'INVALID-NEW-MESSAGE-ID';
    // when
    await expect(createMessageIdReplacements([{oldMessageId, newMessageId}]))
      // then
      .rejects.toThrow('invalid input syntax for type uuid');

    expect(logError).toHaveBeenCalledWith(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
  });

  it('should throw an error when try to register again with the same oldMessageId', async () => {
    // given
    const oldMessageId = uuidv4();
    const newMessageId = uuidv4();
    await createMessageIdReplacements([{oldMessageId, newMessageId}]);

    // when
    await expect(createMessageIdReplacements([{oldMessageId, newMessageId}]))
      //then
      .rejects.toThrow(UniqueConstraintError);

    expect(logError).toHaveBeenCalledWith(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
  });
});
