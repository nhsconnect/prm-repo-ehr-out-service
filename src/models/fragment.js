import { RecordType } from '../constants/enums';

export const isFragment = dynamoDbItem => {
  return dynamoDbItem?.Layer?.startsWith(RecordType.FRAGMENT);
};
