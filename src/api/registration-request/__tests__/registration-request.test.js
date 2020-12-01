import request from 'supertest';
import app from '../../../app';
import { initializeConfig } from '../../../config';

jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({ sequelize: { dialect: 'postgres' } })
}));

describe('POST /registration-requests/', () => {
  initializeConfig.mockReturnValue({ repoToGpAuthKeys: 'correct-key' });

  const mockBody = {
    data: {
      type: 'registration-requests',
      id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
      attributes: {
        nhsNumber: '1111111111',
        odsCode: 'A12345'
      }
    }
  };

  it('should return a 204 if nhsNumber, odsCode, type, conversationId are provided', async () => {
    const res = await request(app)
      .post('/registration-requests/')
      .set('Authorization', 'correct-key')
      .send(mockBody);

    expect(res.statusCode).toBe(204);
  });

  it('should return a 204 if Authorization Header is provided', async () => {
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
      const errorMessage = [
        { 'data.attributes.nhsNumber': "'nhsNumber' provided is not 10 characters" }
      ];
      const mockBody = {
        data: {
          type: 'registration-requests',
          id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
          attributes: {
            nhsNumber: '111111',
            odsCode: 'A12345'
          }
        }
      };
      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if :nhsNumber is not numeric', async () => {
      const errorMessage = [{ 'data.attributes.nhsNumber': "'nhsNumber' provided is not numeric" }];
      const mockBody = {
        data: {
          type: 'registration-requests',
          id: '5BB36755-279F-43D5-86AB-DEFEA717D93F',
          attributes: {
            nhsNumber: 'xxxxxxxxxx',
            odsCode: 'A12345'
          }
        }
      };
      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send(mockBody);

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if :conversationId is not uuid', async () => {
      const errorMessage = [{ 'data.id': "'conversationId' provided is not of type UUIDv4" }];
      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ data: { ...mockBody.data, id: 'not-a-uuid' } });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });

    it('should return an error if type is not valid', async () => {
      const errorMessage = [{ 'data.type': 'Invalid value' }];
      const res = await request(app)
        .post('/registration-requests/')
        .set('Authorization', 'correct-key')
        .send({ data: { ...mockBody.data, type: 'invalid-type' } });

      expect(res.statusCode).toBe(422);
      expect(res.body).toEqual({ errors: errorMessage });
    });
  });
});
