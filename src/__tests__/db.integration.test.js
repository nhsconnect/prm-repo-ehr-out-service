import ModelFactory from '../models';
import { modelName as registrationRequestModel } from '../models/registration-request';
import { createRegistrationRequest } from "../services/database/create-registration-request";
import { logInfo } from "../middleware/logging";
import { createRandomUUID } from "../services/gp2gp/__tests__/test-utils";

describe('Database connection test', () => {
  const RegistrationRequest = ModelFactory.getByName(registrationRequestModel);

  beforeAll(async () => {
    await RegistrationRequest.sync({ force: true });
  });

  afterAll(async () => {
    await RegistrationRequest.truncate();
    await RegistrationRequest.sync({ force: true });
    await RegistrationRequest.sequelize.close();
  });

  it('should verify that the database connection pool is able to handle 100 concurrent transactions simultaneously', async () => {
    // given
    const numberOfTransactions = 100;
    const nhsNumber = 1234567890;
    const odsCode = "B00145";
    const databaseOperationPromises = [];

    // when
    for (let i = 0; i < numberOfTransactions; i++) {
      const [conversationId, messageId] = createRandomUUID(2);

      databaseOperationPromises.push(
          createRegistrationRequest(conversationId, messageId, nhsNumber, odsCode)
      );
    }

    await Promise.all(databaseOperationPromises).then(() => {
      logInfo("Database operations complete!");
    });

    const registrationRequestCount = await RegistrationRequest.count();

    // then
    expect(registrationRequestCount).toEqual(numberOfTransactions);
  });
});