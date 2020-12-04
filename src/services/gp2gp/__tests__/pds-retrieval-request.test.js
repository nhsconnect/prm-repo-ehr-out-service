import nock from 'nock';
import { getPdsPatientDetails } from '../pds-retrieval-request';
import { logError, logEvent } from '../../../middleware/logging';

jest.mock('../../../middleware/logging');
jest.mock('../../../config', () => ({
  initializeConfig: jest.fn().mockReturnValue({
    gp2gpAdaptorAuthKeys: 'fake-keys',
    gp2gpAdaptorServiceUrl: 'http://localhost'
  })
}));

describe('sendPdsRetrievalRequest', () => {
  const mockGp2gpAdaptorServiceUrl = 'http://localhost';
  const mockGp2gpAdaptorAuthKeys = 'fake-keys';
  const headers = { reqheaders: { Authorization: `${mockGp2gpAdaptorAuthKeys}` } };
  const nhsNumber = '1234567890';
  const serialChangeNumber = '123';
  const pdsId = 'chs';
  const odsCode = 'C12345';

  it('should retrieve patient and return 200 with odsCode, pdsId and serialChangeNumber', async () => {
    const mockBody = { data: { serialChangeNumber, pdsId, odsCode } };
    const scope = nock(mockGp2gpAdaptorServiceUrl, headers)
      .get(`/patient-demographics/${nhsNumber}`)
      .reply(200, mockBody);

    const res = await getPdsPatientDetails(nhsNumber);
    expect(scope.isDone()).toBe(true);
    expect(logEvent).toHaveBeenCalledWith('Successfully retrieved patient from PDS', {
      nhsNumber,
      odsCode
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual(mockBody)
  });

  it('should log and throw error when pds retrieval returns 500', async () => {
    let error = null;
    const expectedError = new Error('Request failed with status code 500');
    nock(mockGp2gpAdaptorServiceUrl, headers).get(`/patient-demographics/${nhsNumber}`).reply(500);

    try {
      await getPdsPatientDetails(nhsNumber);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(logError).toHaveBeenCalledWith('Unable to retrieve patient from PDS', expectedError);
  });
});
