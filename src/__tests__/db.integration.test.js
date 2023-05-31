import { v4 as uuid } from 'uuid';
import ModelFactory from '../models';
import { modelName as messageFragmentModel } from '../models/message-fragment';
import { modelName as registrationRequestModel } from '../models/registration-request';
import { readFile } from './utilities/integration-test.utilities';
import {patientAndPracticeOdsCodesMatch, updateAllFragmentsMessageIds} from '../services/transfer/transfer-out-util';
import { getAllFragmentsWithMessageIdsFromRepo } from '../services/ehr-repo/get-fragments';
import { transferOutFragments } from '../services/transfer/transfer-out-fragments';
import { sendFragment } from '../services/gp2gp/send-fragment';
import { createRegistrationRequest } from '../services/database/create-registration-request';

jest.mock('../services/ehr-repo/get-fragments');
jest.mock('../services/transfer/transfer-out-util');
jest.mock('../services/gp2gp/send-fragment');

describe('Database connection test', () => {
  // ============ COMMON PROPERTIES ============
  // Database Models
  const MessageFragment = ModelFactory.getByName(messageFragmentModel);
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);

  // =================== END ===================

  beforeAll(async () => {
    await RegistrationRequest.truncate();
    await MessageFragment.truncate();
    await MessageFragment.sync({ force: true });
  });

  afterAll(async () => {
    await RegistrationRequest.sequelize.sync({ force: true });
    await MessageFragment.sequelize.sync({ force: true });
    await ModelFactory.sequelize.close();
  });

  it('should be able to handle sending out 25 fragments at once', async () => {
    // given
    const NHS_NUMBER = 9693796047;
    const CONVERSATION_ID = uuid().toUpperCase();
    const ODS_CODE = 'B85002';
    const SINGLE_FRAGMENT = readFile(
      'COPC_IN000001UK01_01',
      'equality-test',
      'large-ehr-with-external-attachments',
      'original'
    );

    const NUMBER_OF_FRAGMENTS = 25;
    const FRAGMENT_MESSAGE_IDS = Array(NUMBER_OF_FRAGMENTS)
      .fill(null)
      .map(_ => uuid().toUpperCase());
    const FRAGMENTS_WITH_MESSAGE_IDS = {};
    FRAGMENT_MESSAGE_IDS.forEach(fragmentId => {
      FRAGMENTS_WITH_MESSAGE_IDS[fragmentId] = SINGLE_FRAGMENT;
    });


    // create the registration request record first so that CONVERSATION_ID is a valid foreign key
    await createRegistrationRequest(CONVERSATION_ID, NHS_NUMBER, ODS_CODE);

    // when
    getAllFragmentsWithMessageIdsFromRepo.mockReturnValue(Promise.resolve(FRAGMENTS_WITH_MESSAGE_IDS));
    patientAndPracticeOdsCodesMatch.mockReturnValue(Promise.resolve(true));
    sendFragment.mockResolvedValue(undefined);
    updateAllFragmentsMessageIds.mockReturnValue(Promise.resolve(FRAGMENTS_WITH_MESSAGE_IDS));

    await transferOutFragments({
      conversationId: CONVERSATION_ID,
      nhsNumber: NHS_NUMBER,
      odsCode: ODS_CODE
    });
    const numberOfMessagesInDatabase = await MessageFragment.count();

    // then
    expect(numberOfMessagesInDatabase).toEqual(NUMBER_OF_FRAGMENTS);
  });
});
