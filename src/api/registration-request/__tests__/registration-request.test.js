import request from 'supertest';
import app from '../../../app';
import { initializeConfig } from '../../../config';

jest.mock('../../../config');

describe('POST /registration-requests/', () => {
  initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });

  const mockBody = {
    nhsNumber: '1111111111',
    odsCode: 'A12345',
    conversationId: '5BB36755-279F-43D5-86AB-DEFEA717D93F'
  };

  it('should return a 201 if nhsNumber, odsCode and conversationId are provided', async () => {
    const res = await request(app)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(201);
  });

  it('should return a 201 if Authorization Header is provided', async () => {
    const res = await request(app)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.request.header['Authorization']).toBe('correct-key');
  });

  it('should return a 401 if Authorization Header is not provided', async () => {
    const res = await request(app).post('/registration-requests/').send(mockBody);

    expect(res.request.header['Authorization']).toBeUndefined();
    expect(res.statusCode).toBe(401);
  });

  describe('validations', () => {
    it('should return an error if :nhsNumber is less than 10 digits', async () => {
      const errorMessage = [{ nhsNumber: "'nhsNumber' provided is not 10 characters" }];

      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ ...mockBody, nhsNumber: '111111' });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if :nhsNumber is not numeric', async () => {
      const errorMessage = [{ nhsNumber: "'nhsNumber' provided is not numeric" }];

      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ ...mockBody, nhsNumber: 'xxxxxxxxxx' });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if :conversationId is not uuid', async () => {
      const errorMessage = [{ conversationId: "'conversationId' provided is not of type UUIDv4" }];

      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ ...mockBody, conversationId: 'not-a-uuid' });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });
  });
});
