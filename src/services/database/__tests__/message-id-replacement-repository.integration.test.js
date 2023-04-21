import ModelFactory from '../../../models';
import { modelName } from '../../../models/message-id-replacement';
import {
  getNewMessageIdByOldMessageId
} from '../../database/message-id-replacement-repository';
import { v4 } from 'uuid';
import {logError} from "../../../middleware/logging";
import {errorMessages, FragmentMessageIdRecordNotFoundError} from "../../../errors/errors";

jest.mock("../../../middleware/logging");

describe('message-id-replacement-repository', () => {

  afterAll(() => {
    // close the db connection to avoid "Jest did not exit" warning messages
    MessageIdReplacement.sequelize.close();
  });

  const uuidv4UpperCase = () => v4().toUpperCase();
  const MessageIdReplacement = ModelFactory.getByName(modelName);

  describe('getNewMessageIdByOldMessageId', () => {
    it('should return the new message id of a given old message id (in uppercase)', async () => {
      // given
      const oldMessageId = uuidv4UpperCase();
      const newMessageId = uuidv4UpperCase();
      await MessageIdReplacement.create({
        oldMessageId, newMessageId
      });

      // when
      const newMessageIdFromRecord = await getNewMessageIdByOldMessageId(oldMessageId);

      // then
      expect(newMessageIdFromRecord).toBe(newMessageId);
      expect(newMessageIdFromRecord).toBe(newMessageIdFromRecord.toUpperCase());
    });

    it('should be case insensitive when getting a record by oldMessageId', async () => {
      // given
      const oldMessageId = uuidv4UpperCase();
      const newMessageId = uuidv4UpperCase();
      await MessageIdReplacement.create({
        oldMessageId, newMessageId
      });

      const oldMessageIdInLowerCase = oldMessageId.toLowerCase();


      // when
      const newMessageIdFromRecord = await getNewMessageIdByOldMessageId(oldMessageId);

      // then
      expect(newMessageIdFromRecord).toBe(newMessageId);
      expect(newMessageIdFromRecord).toBe(newMessageIdFromRecord.toUpperCase());

    });

    it('should throw an error if the oldMessageId is not found in database', async () => {
      // given
      const oldMessageId = uuidv4UpperCase();

      // when
      await expect(getNewMessageIdByOldMessageId(oldMessageId)).
        // then
        rejects.toThrow(FragmentMessageIdRecordNotFoundError)

      expect(logError).toHaveBeenCalledWith(`${errorMessages.FRAGMENT_MESSAGE_ID_RECORD_NOT_FOUND_ERROR}, related oldMessageId: ${oldMessageId}`)
    });
  });
});