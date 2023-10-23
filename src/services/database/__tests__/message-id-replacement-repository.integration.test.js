import { errorMessages, FragmentMessageIdReplacementRecordNotFoundError } from "../../../errors/errors";
import { getAllMessageIdReplacements } from "../message-id-replacement-repository";
import { createMessageIdReplacements } from "../create-message-id-replacements";
import { modelName } from '../../../models/message-id-replacement';
import { logError } from "../../../middleware/logging";
import ModelFactory from '../../../models';
import { v4 as uuidv4 } from 'uuid';
import expect from "expect";

describe('message-id-replacement-repository', () => {
  // Global test variables.
  let messageIdReplacementRecords;
  const numberOfRecordsToSeed = 10;

  // Seed the database with test values.
  beforeAll(async () => {
    messageIdReplacementRecords = await seedTestData(numberOfRecordsToSeed);
  });

  afterAll(async () => {
    await MessageIdReplacement.truncate();
    await MessageIdReplacement.sync({ force: true });
    await MessageIdReplacement.sequelize.close();
  });

  const MessageIdReplacement = ModelFactory.getByName(modelName);

  describe('getAllMessageIdReplacements', () => {
    it('should retrieve all of the message ids with replacements successfully', async () => {
      // when
      const result = await getAllMessageIdReplacements(getAllOldMessageIds(messageIdReplacementRecords));

      const messageIds = {
        oldMessageIdsFromResult: getAllOldMessageIds(result),
        oldMessageIds: getAllOldMessageIds(messageIdReplacementRecords),
        newMessageIdsFromResult: getAllNewMessageIds(result),
        newMessageIds: getAllNewMessageIds(messageIdReplacementRecords).map(messageId => messageId.toUpperCase())
      }

      // then
      expect(messageIds.oldMessageIdsFromResult).toEqual(messageIds.oldMessageIds);
      expect(messageIds.newMessageIdsFromResult).toEqual(messageIds.newMessageIds);
    });

    it('should throw FragmentMessageIdReplacementRecordNotFoundError if provided a non-existent message id', async () => {
      // given
      const nonExistentMessageId = "faed05ff-7f8f-41f9-b44f-5e98289c98f2";

      try {

        // when
        await getAllMessageIdReplacements([...getAllOldMessageIds(messageIdReplacementRecords), nonExistentMessageId]);

      } catch (error) {

        // then
        expect(error).not.toBeNull();
        expect(error).toBeInstanceOf(FragmentMessageIdReplacementRecordNotFoundError);
        expect(error.message).toEqual(errorMessages.FRAGMENT_MESSAGE_ID_REPLACEMENT_RECORD_NOT_FOUND_ERROR);

      }
    });
  });
});

const seedTestData = async (numberOfRecordsToSeed) => {
  try {
    const messageIdReplacementRecords = Array(numberOfRecordsToSeed)
        .fill(undefined)
        .map(() => {
          return {
            oldMessageId: uuidv4(),
            newMessageId: uuidv4()
          }
        });

    await createMessageIdReplacements(messageIdReplacementRecords);

    return messageIdReplacementRecords;
  } catch (error) {
    logError(error);
    throw error;
  }
}

const getAllOldMessageIds = (records) => records.map(record => record.oldMessageId);

const getAllNewMessageIds = (records) => records.map(record => record.newMessageId);
