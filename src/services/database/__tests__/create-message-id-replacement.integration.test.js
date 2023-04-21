import { logInfo, logError } from '../../../middleware/logging';
import ModelFactory from '../../../models';
import { modelName } from '../../../models/message-id-replacement';
import { createMessageIdReplacement } from '../create-message-id-replacement';
import { runWithinTransaction } from '../helper';
import { v4 } from 'uuid';
import { ValidationError, UniqueConstraintError } from 'sequelize';
import { errorMessages } from "../../../errors/errors";

jest.mock('../../../middleware/logging');

describe('createMessageIdReplacement', () => {
  const MessageIdReplacement = ModelFactory.getByName(modelName);

  const uuidv4 = () => v4().toUpperCase();

  it('should create a record of oldMessageId with newMessageId', async () => {
    // given
    const oldMessageId = uuidv4();
    const newMessageId = uuidv4();

    // when
    await createMessageIdReplacement(oldMessageId, newMessageId);

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
    await createMessageIdReplacement(oldMessageId, newMessageId);

    // then
    const expectedLogMessage = `Recorded a pair of message id mapping: {inbound: ${oldMessageId}, outbound: ${newMessageId}}`;
    expect(logInfo).toBeCalledWith(expectedLogMessage);
  });

  it('should throw an error when oldMessageId is invalid', async () => {
    // when
    await expect(createMessageIdReplacement('invalid-old-message-id', uuidv4()))
      // then
      .rejects.toThrow('Validation error: Validation isUUID on oldMessageId failed');

    expect(logError).toHaveBeenCalledWith(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
    expect(logError).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('should throw an error when newMessageId is invalid', async () => {
    // when
    await expect(createMessageIdReplacement(uuidv4(), 'invalid-new-message-id'))
      // then
      .rejects.toThrow('Validation error: Validation isUUID on newMessageId failed');

    expect(logError).toHaveBeenCalledWith(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);
    expect(logError).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('should throw an error when try to register again with the same oldMessageId', async () => {
    // given
    const oldMessageId = uuidv4();
    await createMessageIdReplacement(oldMessageId, uuidv4());

    // when
    await expect(createMessageIdReplacement(oldMessageId, uuidv4()))
      //then
      .rejects.toThrow(UniqueConstraintError);

    expect(logError).toHaveBeenCalledWith(errorMessages.MESSAGE_ID_RECORD_CREATION_ERROR);

  })
});
