import nock from 'nock';
import { getPdsOdsCode } from '../pds-retrieval-request';
import { logError, logInfo } from '../../../middleware/logging';

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

    const res = await getPdsOdsCode(nhsNumber);
    expect(scope.isDone()).toBe(true);
    expect(logInfo).toHaveBeenCalledWith('Successfully retrieved patient from PDS');

    expect(res).toEqual(odsCode);
  });

  it('should log and throw error when pds retrieval returns 500', async () => {
    let error = null;
    const expectedError = new Error('Request failed with status code 500');
    nock(mockGp2gpAdaptorServiceUrl, headers).get(`/patient-demographics/${nhsNumber}`).reply(500);

    try {
      await getPdsOdsCode(nhsNumber);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(logError).toHaveBeenCalledWith('Unable to retrieve patient from PDS', expectedError);
  });
});
