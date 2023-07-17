import { config } from '../../../config';
import path from 'path';
import { readFileSync } from 'fs';

import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';

const GP2GP_MESSENGER_URL = 'http://localhost';
const GP2GP_MESSENGER_AUTH_KEY = 'fake-keys';
export const setupEnvVarForTest = () => {
  config.mockReturnValue({
    gp2gpMessengerAuthKeys: GP2GP_MESSENGER_AUTH_KEY,
    gp2gpMessengerServiceUrl: GP2GP_MESSENGER_URL
  });
};

export const createRandomUUID = number => {
  return Array(number)
    .fill('')
    .map(() => uuidv4());
};

export const EhrMessageType = {
  core: 'core',
  fragment: 'fragment',
  coreWithLargeMedicalHistory: 'CoreWithLargeMedicalHistory'
};

export const isSmallerThan256KB = input => {
  const jsObjectAsString = typeof input == 'string' ? input : JSON.stringify(input);
  return jsObjectAsString.length < 256 * 1024;
};

export const createMockGP2GPScope = (messageType, response = [200, 'OK']) => {
  let endpoint = '/ehr-out-transfers/';
  let outboundRequestBody = {};

  if (messageType === EhrMessageType.core) {
    endpoint += 'core';
  } else {
    endpoint += 'fragment';
  }

  const scope = nock(GP2GP_MESSENGER_URL)
    .post(endpoint, requestBody => {
      Object.assign(outboundRequestBody, requestBody);
      return true;
    })
    .reply(() => response);

  scope.outboundRequestBody = outboundRequestBody;

  return scope;
};

export const loadTestData = filename => {
  return JSON.parse(readFileSync(path.join(__dirname, 'data', filename), 'utf8'));
};
