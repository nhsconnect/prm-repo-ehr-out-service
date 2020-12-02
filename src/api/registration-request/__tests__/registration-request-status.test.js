import request from 'supertest';
import app from '../../../app';
import { Status } from '../../../models/registration-request';
import { getRegistrationRequestStatusByConversationId } from '../../../services/database/registration-request-repository';
import { logError } from '../../../middleware/logging';

jest.mock('../../../middleware/logging');
jest.mock('../../../services/database/registration-request-repository');
jest.mock('../../../config', () => ({
  initializeConfig: jest
    .fn()
    .mockReturnValue({ sequelize: { dialect: 'postgres' }, repoToGpAuthKeys: 'valid-key' })
}));

describe('GET /registration-requests/', () => {
  const nhsNumber = '1234567890';
  const conversationId = '3a3ee007-1188-4978-8122-c1e2596f29c6';
  const odsCode = 'A12345';
  const invalidConversationId = 'de78578799';
  const status = Status.REGISTRATION_REQUEST_RECEIVED;

  it('should return 200 and registration request information if :conversationId is uuid and Authorization Header provided', async () => {
    getRegistrationRequestStatusByConversationId.mockResolvedValue({
      conversationId,
      nhsNumber,
      odsCode,
      status
    });

    const res = await request(app)
      .get(`/registration-requests/${conversationId}`)
      .set('Authorization', 'valid-key');

    const mockBody = {
      data: {
        type: 'registration-requests',
        id: conversationId,
        attributes: {
          nhsNumber,
          odsCode,
          status
        }
      }
    };

    expect(res.statusCode).toBe(200);
    expect(getRegistrationRequestStatusByConversationId).toHaveBeenCalledWith(conversationId);
    expect(res.body).toEqual(mockBody);
  });

  it('should return an error if :conversationId is not valid', async () => {
    const errorMessage = [{ conversationId: "'conversationId' provided is not of type UUIDv4" }];
    const res = await request(app)
      .get(`/registration-requests/${invalidConversationId}`)
      .set('Authorization', 'valid-key');

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      errors: errorMessage
    });
  });

  it('should return 404 when conversation id cannot be found', async () => {
    const nonExistentConversationId = conversationId;
    getRegistrationRequestStatusByConversationId.mockResolvedValue(null);

    const res = await request(app)
      .get(`/registration-requests/${nonExistentConversationId}`)
      .set('Authorization', 'valid-key');

    expect(res.statusCode).toBe(404);
  });

  it('should return 503 when getRegistrationRequestStatusByConversationId returns rejected Promise', async () => {
    getRegistrationRequestStatusByConversationId.mockRejectedValue({});

    const res = await request(app)
      .get(`/registration-requests/${conversationId}`)
      .set('Authorization', 'valid-key');

    expect(logError).toHaveBeenCalledWith('Registration request status call failed', {});
    expect(res.statusCode).toBe(503);
  });
});
